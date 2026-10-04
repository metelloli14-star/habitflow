# Развёртывание на сервере

Пошаговая инструкция: от чистого сервера до работающего сайта https://poleznyeprivychki.ru.

```
браузер ──HTTPS──▶ nginx :443 ──▶ Next.js (systemd) 127.0.0.1:3000 ──▶ PostgreSQL 127.0.0.1:5432
```

**Исходные условия**
- сервер на Ubuntu 22.04 / 24.04 LTS (на Debian команды те же);
- PostgreSQL уже установлен **на этом же сервере** (если на другом — см. [3.5](#35-если-postgresql-на-другом-сервере));
- домен `poleznyeprivychki.ru`; если у вас другой — замените его во всех командах и файлах;
- команды выполняются от пользователя с правами `sudo`.

**Содержание**

1. [Что подготовить](#шаг-0-что-подготовить)
2. [Базовая настройка сервера](#шаг-1-базовая-настройка-сервера)
3. [Node.js](#шаг-2-nodejs)
4. [PostgreSQL: база и пользователь](#шаг-3-postgresql-база-и-пользователь)
5. [Код приложения](#шаг-4-код-приложения)
6. [Настройки .env.local](#шаг-5-настройки-envlocal)
7. [Установка, миграции, сборка](#шаг-6-установка-миграции-сборка)
8. [Служба systemd](#шаг-7-служба-systemd)
9. [nginx](#шаг-8-nginx)
10. [HTTPS](#шаг-9-https)
11. [Проверка](#шаг-10-проверка)
12. [Резервные копии базы](#резервные-копии-базы)
13. [Обновление версии](#обновление-версии)
14. [Перенос данных из старой версии (db/data.json)](#перенос-данных-из-старой-версии-dbdatajson)
15. [Типичные проблемы](#типичные-проблемы)
16. [Чек-лист перед запуском](#чек-лист-перед-запуском)

---

## Шаг 0. Что подготовить

- **Сервер в России.** Данные пользователей из России должны храниться в российском дата-центре
  (ч. 5 ст. 18 152-ФЗ): Yandex Cloud, Selectel, VK Cloud, Timeweb и т. п. Адрес дата-центра понадобится
  для уведомления в Роскомнадзор.
- **Память:** от 2 ГБ RAM. На 1 ГБ сборка `next build` может упасть — тогда добавьте swap (шаг 1).
- **DNS:** A-записи `poleznyeprivychki.ru` и `www.poleznyeprivychki.ru` → IP сервера. Проверка:
  ```bash
  dig +short poleznyeprivychki.ru
  ```
- **Почта для кодов:** ящик `no-reply@poleznyeprivychki.ru` в Яндекс 360 (или Mail.ru) и пароль приложения;
  записи SPF и DKIM в DNS домена (их выдаёт почтовый сервис). Без SMTP регистрация на продакшене не работает.
- **VK ID** (по желанию): ID приложения из кабинета id.vk.ru — см. README, раздел «Вход через VK ID».
- **Доступ к репозиторию** GitHub `metelloli14-star/habitflow`.

## Шаг 1. Базовая настройка сервера

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx certbot python3-certbot-nginx
```

Файрвол: открываем только SSH, HTTP и HTTPS. Порты 3000 (приложение) и 5432 (PostgreSQL) снаружи
недоступны — к ним ходят только nginx и само приложение.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Если памяти меньше 2 ГБ — добавьте swap на 2 ГБ:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Шаг 2. Node.js

Нужен Node.js 24 LTS (Prisma 7 требует 20.19+, 22.12+ или 24+).

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

`node -v` должен показать `v24.…`.

## Шаг 3. PostgreSQL: база и пользователь

Приложению нужна отдельная база `habitflow` и отдельный пользователь `habitflow` — владелец этой базы,
без прав суперпользователя. Таблицы создаёт не человек, а миграции Prisma (шаг 6).

### 3.1. Проверьте, что PostgreSQL работает

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

### 3.2. Придумайте пароль

Пароль попадёт в адрес подключения `DATABASE_URL`, поэтому в нём не должно быть символов `@ : / ? # %`.
Надёжный пароль без них:

```bash
openssl rand -hex 24
```

Сохраните его — он понадобится дважды: сейчас и в шаге 5.

### 3.3. Создайте пользователя и базу

```bash
sudo -u postgres psql
```

В консоли `psql` выполните по очереди:

```sql
CREATE ROLE habitflow WITH LOGIN;
\password habitflow
CREATE DATABASE habitflow OWNER habitflow ENCODING 'UTF8' TEMPLATE template0;
\q
```

`\password` дважды спросит пароль из шага 3.2 (так пароль не остаётся в истории команд).

Владелец базы может создавать в ней таблицы — этого достаточно для миграций. На сервере используется только
`prisma migrate deploy`: ему не нужны права на создание баз и «теневая» база, в отличие от `migrate dev`.

### 3.4. Проверьте подключение по паролю

```bash
psql -h 127.0.0.1 -U habitflow -d habitflow -c "SELECT current_user;"
```

После ввода пароля должно появиться `habitflow`. Если ошибка:

- `password authentication failed` — неверный пароль, повторите `\password habitflow` (шаг 3.3);
- `no pg_hba.conf entry for host "127.0.0.1"` — в `pg_hba.conf` нет разрешения на вход по паролю с localhost.
  Узнайте путь к файлу:
  ```bash
  sudo -u postgres psql -c "SHOW hba_file;"
  ```
  и проверьте, что в нём есть строка (в Ubuntu она есть по умолчанию):
  ```
  host    all    all    127.0.0.1/32    scram-sha-256
  ```
  После правки:
  ```bash
  sudo systemctl reload postgresql
  ```

Параметр `listen_addresses` в `postgresql.conf` оставьте `localhost` (по умолчанию) — база не должна быть видна из интернета.

### 3.5. Если PostgreSQL на другом сервере

- Подключайтесь по частной сети провайдера, а не через интернет.
- На сервере БД: в `postgresql.conf` — `listen_addresses = 'localhost,<частный IP сервера БД>'`;
  в `pg_hba.conf` — разрешение только для сервера приложения:
  ```
  host    habitflow    habitflow    <IP сервера приложения>/32    scram-sha-256
  ```
  затем `sudo systemctl restart postgresql`, а в файрволе откройте 5432 только для IP сервера приложения:
  ```bash
  sudo ufw allow from <IP сервера приложения> to any port 5432 proto tcp
  ```
- В `DATABASE_URL` (шаг 5) укажите адрес сервера БД вместо `127.0.0.1`. Если соединение всё-таки идёт через
  интернет, включите SSL в PostgreSQL и добавьте к адресу `?sslmode=verify-full` (сертификат с доверенной
  цепочкой) или `?sslmode=no-verify` (самоподписанный сертификат: шифрование без проверки сервера).

## Шаг 4. Код приложения

Приложение работает от отдельного системного пользователя `habitflow` и лежит в `/opt/habitflow`.

```bash
sudo useradd --system --create-home --home-dir /var/lib/habitflow --shell /usr/sbin/nologin habitflow
sudo mkdir -p /opt/habitflow
sudo chown habitflow:habitflow /opt/habitflow
```

Если репозиторий приватный, дайте серверу доступ только на чтение через **deploy key**
(не используйте личный токен GitHub и не храните токены в файлах репозитория):

```bash
sudo -u habitflow mkdir -p -m 700 /var/lib/habitflow/.ssh
sudo -u habitflow ssh-keygen -t ed25519 -N "" -C "habitflow-server" -f /var/lib/habitflow/.ssh/id_ed25519
sudo cat /var/lib/habitflow/.ssh/id_ed25519.pub
```

Скопируйте выведенный ключ в GitHub: репозиторий → Settings → Deploy keys → Add deploy key
(галочку «Allow write access» не ставьте). Затем склонируйте код:

```bash
sudo -u habitflow git clone git@github.com:metelloli14-star/habitflow.git /opt/habitflow
```

При первом подключении SSH спросит про отпечаток github.com — ответьте `yes`.
Если репозиторий публичный, можно клонировать по `https://github.com/metelloli14-star/habitflow.git`.

## Шаг 5. Настройки (.env.local)

```bash
sudo -u habitflow cp /opt/habitflow/.env.example /opt/habitflow/.env.local
sudo -u habitflow nano /opt/habitflow/.env.local
sudo chmod 600 /opt/habitflow/.env.local
```

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | **обязательно**: `postgresql://habitflow:ПАРОЛЬ_ИЗ_ШАГА_3@127.0.0.1:5432/habitflow` |
| `SMTP_HOST`, `SMTP_PORT` | `smtp.yandex.ru`, `465` (или `smtp.mail.ru`, `465`) |
| `SMTP_USER`, `SMTP_PASS` | ящик `no-reply@poleznyeprivychki.ru` и **пароль приложения** (не пароль от ящика) |
| `MAIL_FROM` | `"Привычка <no-reply@poleznyeprivychki.ru>"` |
| `VK_ID_CLIENT_ID` | ID приложения VK ID; пусто — кнопка VK скрыта |
| `VK_ID_REDIRECT_URI` | `https://poleznyeprivychki.ru/api/auth/vk/callback` |

`NODE_ENV` в этот файл не пишите — он задаётся в службе systemd (шаг 7).
Файл читают и Next.js, и Prisma CLI (через `prisma.config.ts`). После любых изменений в нём перезапустите
приложение: `sudo systemctl restart habitflow`.

## Шаг 6. Установка, миграции, сборка

```bash
cd /opt/habitflow
sudo -u habitflow npm install
sudo -u habitflow npm run db:deploy
sudo -u habitflow npm run build
```

- `npm install` ставит зависимости и генерирует клиент Prisma (`db/generated`). Предупреждения `npm warn` не страшны.
- `npm run db:deploy` (= `prisma migrate deploy`) создаёт таблицы по миграциям из `prisma/migrations`.
  В конце должно быть `All migrations have been successfully applied`.
- `npm run build` собирает приложение; успешная сборка заканчивается таблицей со списком страниц.

Проверьте, что таблицы появились:

```bash
sudo -u postgres psql -d habitflow -c '\dt'
```

Должны быть `users`, `sessions`, `habits`, `completions`, `water_entries` и служебная `_prisma_migrations`.

> **Никогда не запускайте на сервере** `npm run db:seed` (создаст демо-аккаунт с общеизвестным паролем
> `demo12345`), `npm run db:reset` (удалит все данные) и `npm run db:migrate` (команда для разработки).
> На сервере — только `npm run db:deploy`.

## Шаг 7. Служба systemd

Создайте файл службы:

```bash
sudo nano /etc/systemd/system/habitflow.service
```

```ini
[Unit]
Description=Privychka (Next.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=habitflow
Group=habitflow
WorkingDirectory=/opt/habitflow
Environment=NODE_ENV=production
ExecStart=/opt/habitflow/node_modules/.bin/next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Запустите и включите автозапуск:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now habitflow
sudo systemctl status habitflow
```

Проверка, что приложение отвечает и видит базу:

```bash
curl -s http://127.0.0.1:3000/api/auth/providers
curl -s http://127.0.0.1:3000/api/auth/me
```

Первая команда вернёт `{"vk":"live"}` или `{"vk":"off"}`, вторая — `{"error":"Войдите в аккаунт…"}`:
это нормально, значит запрос дошёл до базы и сессии не нашлось.

Запускайте **один** экземпляр приложения: счётчики защиты от перебора хранятся в памяти процесса.

## Шаг 8. nginx

```bash
sudo nano /etc/nginx/sites-available/habitflow
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name poleznyeprivychki.ru www.poleznyeprivychki.ru;

    # Фото профиля приходит в JSON (до ~400 КБ)
    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;

        # IP клиента для защиты от перебора. nginx выставляет его сам — подделать заголовок нельзя.
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;

        # Next.js строит адреса редиректов как localhost:3000 — возвращаем их на домен.
        proxy_redirect http://localhost:3000/ $scheme://$host/;
        proxy_redirect https://localhost:3000/ $scheme://$host/;
    }
}
```

Две строки `proxy_redirect` обязательны: без них редирект на экран входа (`/home` → `/welcome`) и возврат
из VK ID уводят браузер на `https://localhost:3000/…`.

Включите сайт и отключите стандартную заглушку nginx:

```bash
sudo ln -s /etc/nginx/sites-available/habitflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Другой порт вместо 3000

Если порт 3000 занят другим приложением, выберите свободный (ниже — 3010). Проверить, что порт свободен
(пустой вывод — свободен):

```bash
sudo ss -ltnp | grep ':3010 '
```

Порт нужно заменить **в трёх местах** — иначе nginx не найдёт приложение или редиректы уйдут на `localhost`:

1. `/etc/systemd/system/habitflow.service` — `ExecStart=… next start -p 3010 -H 127.0.0.1`;
2. `/etc/nginx/sites-available/habitflow` — `proxy_pass http://127.0.0.1:3010;`;
3. там же обе строки `proxy_redirect` — `http://localhost:3010/` и `https://localhost:3010/`
   (Next.js подставляет в адреса редиректов именно свой порт).

Применить:

```bash
sudo systemctl daemon-reload
sudo systemctl restart habitflow
sudo nginx -t && sudo systemctl reload nginx
curl -s http://127.0.0.1:3010/api/auth/providers
```

Снаружи сайт по-прежнему открывается на 443 (https) — порт приложения виден только nginx.
Локально другой порт задаётся так: `npm run dev -- -p 3001` (или `PORT=3001 npm run dev`), для собранной версии — `npm start -- -p 3001`.

## Шаг 9. HTTPS

```bash
sudo certbot --nginx -d poleznyeprivychki.ru -d www.poleznyeprivychki.ru
```

Certbot спросит email для уведомлений, получит бесплатный сертификат Let's Encrypt, допишет его в конфиг nginx
и включит перенаправление с http на https. Сертификат продлевается автоматически; проверить продление:

```bash
sudo certbot renew --dry-run
```

HTTPS обязателен: на продакшене cookie сессии ставится с флагом `Secure`, и по http вход не работает.

## Шаг 10. Проверка

```bash
curl -sI https://poleznyeprivychki.ru | head -1
curl -s https://poleznyeprivychki.ru/api/auth/providers
curl -sI https://poleznyeprivychki.ru/home | grep -i location
```

1. Первая команда — `HTTP/2 200`.
2. Вторая — `{"vk":"live"}` (VK ID настроен) или `{"vk":"off"}`.
3. Третья — `location: https://poleznyeprivychki.ru/welcome` (не `localhost`!).
4. В браузере: зарегистрируйтесь на реальный ящик → письмо с кодом пришло → вход выполнен → создайте
   привычку, отметьте её, добавьте воду.
5. Данные легли в базу:
   ```bash
   sudo -u postgres psql -d habitflow -c "SELECT email, email_verified, created_at FROM users;"
   ```

Логи приложения:

```bash
sudo journalctl -u habitflow -f
```

---

## Резервные копии базы

Копия делается каждую ночь через `pg_dump` и хранится 14 дней. В базе персональные данные (email, хэши паролей,
фото), поэтому копии доступны только root.

Создайте скрипт:

```bash
sudo nano /usr/local/bin/habitflow-backup
```

```sh
#!/bin/sh
# Резервная копия базы «Привычки» (pg_dump, формат custom). Хранится KEEP_DAYS дней.
set -eu
DIR=/var/backups/habitflow
KEEP_DAYS=14
umask 077
mkdir -p "$DIR"
FILE="$DIR/habitflow-$(date +%F-%H%M).dump"
runuser -u postgres -- pg_dump --format=custom habitflow > "$FILE.part"
mv "$FILE.part" "$FILE"
find "$DIR" -name 'habitflow-*.dump' -mtime +"$KEEP_DAYS" -delete
```

```bash
sudo chmod 700 /usr/local/bin/habitflow-backup
sudo /usr/local/bin/habitflow-backup
sudo ls -lh /var/backups/habitflow
```

Расписание — файл `/etc/cron.d/habitflow`:

```bash
sudo nano /etc/cron.d/habitflow
```

```
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Резервная копия базы — каждый день в 03:30
30 3 * * * root /usr/local/bin/habitflow-backup

# Удаление истёкших сессий (старше 30 дней) — по воскресеньям в 04:00
0 4 * * 0 postgres psql -d habitflow -qc "DELETE FROM sessions WHERE created_at < now() - interval '30 days'"
```

Храните копию и вне сервера (например, в объектном хранилище того же российского провайдера):
копия на том же диске не спасёт при потере сервера.

### Восстановление из копии

Сначала проверьте копию на отдельной базе — рабочая база при этом не затрагивается:

```bash
sudo -u postgres createdb -O habitflow habitflow_check
sudo -u postgres pg_restore --no-owner --role=habitflow -d habitflow_check /var/backups/habitflow/habitflow-2026-10-04-0330.dump
sudo -u postgres psql -d habitflow_check -c "SELECT count(*) FROM users;"
sudo -u postgres dropdb habitflow_check
```

Восстановление рабочей базы (**текущие данные будут заменены копией**):

```bash
sudo systemctl stop habitflow
sudo -u postgres dropdb habitflow
sudo -u postgres createdb -O habitflow habitflow
sudo -u postgres pg_restore --no-owner --role=habitflow -d habitflow /var/backups/habitflow/habitflow-2026-10-04-0330.dump
sudo systemctl start habitflow
```

Имя файла подставьте своё (`sudo ls /var/backups/habitflow`).

## Обновление версии

```bash
sudo /usr/local/bin/habitflow-backup
cd /opt/habitflow
sudo -u habitflow git pull
sudo -u habitflow npm install
sudo -u habitflow npm run db:deploy
sudo -u habitflow npm run build
sudo systemctl restart habitflow
```

- Резервная копия перед обновлением — обязательно: миграции не откатываются сами.
- `db:deploy` применяет только новые миграции из `prisma/migrations`; если их нет — ничего не делает.
- Во время сборки (1–2 минуты) сайт может отвечать ошибками — обновляйтесь, когда пользователей мало.
- Откат: `sudo -u habitflow git checkout <предыдущий коммит>`, затем `npm install`, `npm run build`,
  `sudo systemctl restart habitflow`. Если новая миграция уже изменила базу — восстановите её из копии,
  сделанной перед обновлением.

## Перенос данных из старой версии (db/data.json)

Нужно, только если приложение уже работало на старой версии, хранившей данные в файле `db/data.json`.
Скрипт `prisma/import-from-json.sql` переносит всех пользователей, сессии (никого не разлогинит), привычки,
историю и воду. Он выполняется одной транзакцией и безопасен при повторном запуске.

1. Остановите старую версию, чтобы файл больше не менялся, и сохраните его копию.
2. Выполните шаги 3–6 этой инструкции (база, код, `.env.local`, `npm run db:deploy`).
3. Положите файл в папку проекта и запустите перенос:
   ```bash
   sudo cp /путь/к/старому/data.json /opt/habitflow/db/data.json
   sudo chown habitflow:habitflow /opt/habitflow/db/data.json
   cd /opt/habitflow
   sudo -u habitflow psql -h 127.0.0.1 -U habitflow -d habitflow -f prisma/import-from-json.sql
   ```
4. В конце скрипт печатает таблицу «в data.json / в базе» по каждой таблице. Числа должны совпадать;
   меньше в базе может быть только у записей, ссылающихся на уже удалённых пользователей или привычки.
5. Удалите демо-аккаунт, если он был в файле (у него общеизвестный пароль):
   ```bash
   sudo -u postgres psql -d habitflow -c "DELETE FROM users WHERE email = 'demo@habitflow.ru';"
   ```
6. Проверьте вход в приложение и удалите файл — в нём персональные данные:
   ```bash
   sudo rm /opt/habitflow/db/data.json
   ```

## Типичные проблемы

| Симптом | Причина и решение |
|---|---|
| `502 Bad Gateway` | Приложение не запущено: `sudo systemctl status habitflow`, причина — в `sudo journalctl -u habitflow -n 100` |
| В логах `Can't reach database server`, `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL не запущен или другой порт: `sudo systemctl status postgresql`, проверьте `DATABASE_URL` |
| `password authentication failed for user "habitflow"` | Пароль в `DATABASE_URL` не совпадает с паролем роли или содержит спецсимволы. Задайте новый (шаг 3.2–3.3) и перезапустите службу |
| `The table public.users does not exist` | Не применены миграции: `sudo -u habitflow npm run db:deploy` |
| `permission denied for schema public` при миграции | Владелец базы — не `habitflow`: `sudo -u postgres psql -d habitflow -c "ALTER DATABASE habitflow OWNER TO habitflow;" -c "ALTER SCHEMA public OWNER TO habitflow;"` |
| `Cannot find module './generated/client'` | Не сгенерирован клиент Prisma: `sudo -u habitflow npm run build` (генерация входит в сборку) |
| Сборка обрывается с `Killed` или `heap out of memory` | Мало памяти — добавьте swap (шаг 1) |
| Редирект на `https://localhost:3000/...` | В конфиге nginx нет строк `proxy_redirect` или порт в них не совпадает с портом приложения (шаг 8) |
| Вход «проходит», но сразу выкидывает на экран приветствия | Сайт открыт по http: cookie с флагом `Secure` не сохраняется. Нужен HTTPS (шаг 9) |
| «Отправка писем временно недоступна» | Не заполнены `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` в `.env.local`; после правки — `sudo systemctl restart habitflow` |
| «Не удалось отправить письмо» | Неверный пароль приложения или порт SMTP: подробности в `sudo journalctl -u habitflow \| grep mail` |
| Письма уходят в спам | Не добавлены SPF и DKIM в DNS домена |
| Нет кнопки «Войти с VK ID» | Не заданы `VK_ID_CLIENT_ID` и `VK_ID_REDIRECT_URI` |
| «Слишком много запросов» сразу у всех пользователей | nginx не передаёт `X-Real-IP`, и все запросы считаются с одного адреса — проверьте `proxy_set_header` (шаг 8) |
| `413 Request Entity Too Large` при загрузке фото | Нет `client_max_body_size 2m;` в конфиге nginx |

## Чек-лист перед запуском

- [ ] Сервер в российском дата-центре, уведомление в Роскомнадзор подано
- [ ] Порты 3000 и 5432 закрыты снаружи (`sudo ufw status`)
- [ ] У пользователя базы `habitflow` надёжный пароль, `.env.local` с правами `600`
- [ ] Миграции применены, на сервере **не** запускался `db:seed` (в базе нет `demo@habitflow.ru`)
- [ ] HTTPS работает, http перенаправляется на https, `certbot renew --dry-run` проходит
- [ ] `/home` без входа перенаправляет на `https://poleznyeprivychki.ru/welcome`
- [ ] Письмо с кодом приходит во «Входящие», не в спам
- [ ] Резервная копия делается по расписанию, восстановление проверено на `habitflow_check`
- [ ] Копии базы хранятся и вне сервера
