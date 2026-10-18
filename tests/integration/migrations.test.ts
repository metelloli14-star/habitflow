// Migrations and the one-off import script, run on a fresh in-process PostgreSQL (PGlite) — exactly the SQL the server runs.
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { TINY_PNG } from '../fixtures';

const dir = path.join(process.cwd(), 'prisma/migrations');
const migrations = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'migration.sql'))).sort();
const sqlOf = (name: string) => fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8');

async function databaseUpTo(lastExcluded?: string) {
  const db = await PGlite.create();
  for (const m of migrations) {
    if (m === lastExcluded) break;
    await db.exec(sqlOf(m));
  }
  return db;
}

describe('migrations', () => {
  it('apply in order on an empty database', async () => {
    const db = await databaseUpTo();
    const tables = (await db.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1")).rows;
    expect(tables.map((t) => t.table_name)).toEqual(
      ['avatars', 'completions', 'habits', 'push_subscriptions', 'sent_notifications', 'sent_reminders', 'sessions', 'users', 'water_entries'],
    );
    await db.close();
  });

  it('the photo migration carries existing photos over', async () => {
    const avatarMigration = migrations.find((m) => m.endsWith('_avatar_files'))!;
    const db = await databaseUpTo(avatarMigration);
    await db.query(`INSERT INTO users (id, name, email, first_use_date, avatar) VALUES
      ('11111111-1111-4111-8111-111111111111', 'С фото', 'a@example.com', '2026-01-01', $1),
      ('22222222-2222-4222-8222-222222222222', 'Без фото', 'b@example.com', '2026-01-01', NULL)`, [TINY_PNG]);
    await db.exec(sqlOf(avatarMigration));

    const avatars = (await db.query<{ user_id: string; mime_type: string; data: Uint8Array }>('SELECT * FROM avatars')).rows;
    expect(avatars).toHaveLength(1);
    expect(avatars[0].mime_type).toBe('image/png');
    expect([...avatars[0].data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const users = (await db.query<{ name: string; avatar_version: string | null }>('SELECT name, avatar_version FROM users ORDER BY name')).rows;
    expect(users.find((u) => u.name === 'С фото')?.avatar_version).toMatch(/^[0-9a-f]{12}$/);
    expect(users.find((u) => u.name === 'Без фото')?.avatar_version).toBeNull();
    const columns = (await db.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar'")).rows;
    expect(columns).toHaveLength(0);
    await db.close();
  });
});

describe('import from the old db/data.json', () => {
  const userId = '33333333-3333-4333-8333-333333333333';
  const habitId = '44444444-4444-4444-8444-444444444444';
  const data = {
    users: [
      { id: userId, name: 'Ольга', email: 'olga@example.com', passwordHash: 'x', gender: 'Женский', avatar: TINY_PNG, waterGoal: 2000,
        emailVerified: true, codes: null, firstUseDate: '2026-09-01', createdAt: '2026-09-01T10:00:00.000Z' },
      { id: '55555555-5555-4555-8555-555555555555', name: 'VK', email: '', passwordHash: '', gender: '', avatar: null, waterGoal: 2000,
        emailVerified: false, vkId: '777', firstUseDate: '2026-09-02', createdAt: '2026-09-02T10:00:00.000Z' },
    ],
    sessions: [{ id: '66666666-6666-4666-8666-666666666666', userId, createdAt: '2026-10-01T10:00:00.000Z' }],
    habits: [{ id: habitId, userId, title: 'Бег', category: 'Здоровье', frequency: 'Еженедельно', days: ['Пн'], reminderTime: '',
      goal: null, createdAt: '2026-09-01T10:00:00.000Z' }],
    completions: [
      { id: '77777777-7777-4777-8777-777777777777', userId, habitId, date: '2026-10-12', createdAt: '2026-10-12T10:00:00.000Z' },
      { id: '88888888-8888-4888-8888-888888888888', userId, habitId: '99999999-9999-4999-8999-999999999999', date: '2026-10-12', createdAt: '2026-10-12T10:00:00.000Z' },
    ],
    waterEntries: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId, date: '2026-10-12', amount: 250, time: '09:00', createdAt: '2026-10-12T09:00:00.000Z' }],
  };

  it('moves everything, including photos; skips records pointing nowhere; safe to repeat', async () => {
    const db = await databaseUpTo();
    const script = fs.readFileSync(path.join(process.cwd(), 'prisma/import-from-json.sql'), 'utf8')
      .split('\n').filter((l) => !l.startsWith('\\')).join('\n') // psql meta-commands
      .replace(":'content'", `'${JSON.stringify(data).replace(/'/g, "''")}'`);
    for (let pass = 0; pass < 2; pass++) await db.exec(script);

    const count = async (t: string) => Number((await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n);
    expect(await count('users')).toBe(2);
    expect(await count('sessions')).toBe(1);
    expect(await count('habits')).toBe(1);
    expect(await count('completions')).toBe(1); // the orphan is skipped
    expect(await count('water_entries')).toBe(1);
    expect(await count('avatars')).toBe(1);
    const vk = (await db.query<{ email: string | null }>("SELECT email FROM users WHERE vk_id = '777'")).rows[0];
    expect(vk.email).toBeNull(); // '' becomes NULL so several VK accounts without email can coexist
    await db.close();
  });
});
