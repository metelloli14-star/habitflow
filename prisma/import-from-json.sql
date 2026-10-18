-- Разовый перенос данных из старой файловой базы (db/data.json, версии до перехода на Prisma) в PostgreSQL.
-- Сначала примените миграции (npm run db:deploy). Запускайте из папки проекта: файл читается по пути db/data.json.
--
--   cd /opt/habitflow
--   sudo -u habitflow psql -h 127.0.0.1 -U habitflow -d habitflow -f prisma/import-from-json.sql
--
-- Всё выполняется одной транзакцией: при ошибке в базе ничего не меняется.
-- Повторный запуск безопасен: уже перенесённые записи (тот же id) пропускаются.
-- Записи, ссылающиеся на удалённого пользователя или привычку, пропускаются — их число видно в итоговой таблице.

\set ON_ERROR_STOP on
\set content `cat db/data.json`

BEGIN;

CREATE TEMP TABLE import_src ON COMMIT DROP AS SELECT :'content'::jsonb AS data;

INSERT INTO users (id, name, email, password_hash, gender, water_goal, email_verified, codes,
                   pending_email, vk_id, login_failures, locked_until, first_use_date, created_at)
SELECT (u->>'id')::uuid,
       u->>'name',
       NULLIF(u->>'email', ''),
       COALESCE(u->>'passwordHash', ''),
       COALESCE(u->>'gender', ''),
       COALESCE((u->>'waterGoal')::int, 2000),
       COALESCE((u->>'emailVerified')::boolean, false),
       CASE WHEN jsonb_typeof(u->'codes') = 'object' THEN u->'codes' ELSE '{}'::jsonb END,
       u->>'pendingEmail',
       u->>'vkId',
       COALESCE((u->>'loginFailures')::int, 0),
       (u->>'lockedUntil')::timestamptz,
       (u->>'firstUseDate')::date,
       (u->>'createdAt')::timestamptz
FROM import_src, jsonb_array_elements(data->'users') AS u
ON CONFLICT DO NOTHING;

-- Profile photos (data URLs in the file) go to their own table
INSERT INTO avatars (user_id, mime_type, data)
SELECT (u->>'id')::uuid,
       substring(u->>'avatar' from '^data:([a-z/]+);base64,'),
       decode(substring(u->>'avatar' from ',(.*)$'), 'base64')
FROM import_src, jsonb_array_elements(data->'users') AS u
WHERE u->>'avatar' ~ '^data:image/(jpeg|png|webp);base64,'
  AND EXISTS (SELECT 1 FROM users WHERE id = (u->>'id')::uuid)
ON CONFLICT (user_id) DO NOTHING;

UPDATE users SET avatar_version = substr(md5(random()::text || id::text), 1, 12)
WHERE avatar_version IS NULL AND id IN (SELECT user_id FROM avatars);

INSERT INTO sessions (id, user_id, created_at)
SELECT (s->>'id')::uuid, (s->>'userId')::uuid, (s->>'createdAt')::timestamptz
FROM import_src, jsonb_array_elements(data->'sessions') AS s
WHERE EXISTS (SELECT 1 FROM users WHERE id = (s->>'userId')::uuid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO habits (id, user_id, title, category, frequency, days, reminder_time, goal, created_at)
SELECT (h->>'id')::uuid,
       (h->>'userId')::uuid,
       h->>'title',
       h->>'category',
       h->>'frequency',
       ARRAY(SELECT jsonb_array_elements_text(COALESCE(h->'days', '[]'::jsonb))),
       COALESCE(h->>'reminderTime', ''),
       NULLIF(h->'goal', 'null'::jsonb),
       (h->>'createdAt')::timestamptz
FROM import_src, jsonb_array_elements(data->'habits') AS h
WHERE EXISTS (SELECT 1 FROM users WHERE id = (h->>'userId')::uuid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO completions (id, user_id, habit_id, date, created_at)
SELECT (c->>'id')::uuid, (c->>'userId')::uuid, (c->>'habitId')::uuid, (c->>'date')::date, (c->>'createdAt')::timestamptz
FROM import_src, jsonb_array_elements(data->'completions') AS c
WHERE EXISTS (SELECT 1 FROM habits WHERE id = (c->>'habitId')::uuid AND user_id = (c->>'userId')::uuid)
ON CONFLICT DO NOTHING;

INSERT INTO water_entries (id, user_id, date, amount, time, created_at)
SELECT (w->>'id')::uuid, (w->>'userId')::uuid, (w->>'date')::date, (w->>'amount')::int, w->>'time', (w->>'createdAt')::timestamptz
FROM import_src, jsonb_array_elements(data->'waterEntries') AS w
WHERE EXISTS (SELECT 1 FROM users WHERE id = (w->>'userId')::uuid)
ON CONFLICT (id) DO NOTHING;

-- Сверка: сколько записей в файле и сколько теперь в базе.
SELECT t.name AS "таблица", t.in_json AS "в data.json", t.in_db AS "в базе"
FROM import_src,
LATERAL (VALUES
  ('users',         jsonb_array_length(data->'users'),        (SELECT count(*) FROM users)),
  ('sessions',      jsonb_array_length(data->'sessions'),     (SELECT count(*) FROM sessions)),
  ('habits',        jsonb_array_length(data->'habits'),       (SELECT count(*) FROM habits)),
  ('completions',   jsonb_array_length(data->'completions'),  (SELECT count(*) FROM completions)),
  ('water_entries', jsonb_array_length(data->'waterEntries'), (SELECT count(*) FROM water_entries))
) AS t(name, in_json, in_db);

COMMIT;
