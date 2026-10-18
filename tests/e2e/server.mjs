// End-to-end test stand, started by Playwright (playwright.config.ts) after `npm run build`:
//   - a fresh PostgreSQL (PGlite) with all migrations and the demo account;
//   - a fake mail server that catches the letters with codes (GET http://127.0.0.1:4026/code?to=<email>);
//   - the production build of the app (`next start`) talking to both.
import { execFile, spawn } from 'node:child_process';
import http from 'node:http';
import { promisify } from 'node:util';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { SMTPServer } from 'smtp-server';
import webpush from 'web-push';

const APP_PORT = Number(process.env.E2E_APP_PORT || 3300);
const DB_PORT = Number(process.env.E2E_DB_PORT || 55433);
const SMTP_PORT = Number(process.env.E2E_SMTP_PORT || 2526);
const INBOX_PORT = Number(process.env.E2E_INBOX_PORT || 4026);
const run = promisify(execFile);

// Database
const db = await PGlite.create();
const dbServer = new PGLiteSocketServer({ db, port: DB_PORT, host: '127.0.0.1', maxConnections: 50 });
await dbServer.start();
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres?sslmode=disable`;
await run('npx', ['prisma', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL } });
await run('npx', ['prisma', 'db', 'seed'], { env: { ...process.env, DATABASE_URL, NODE_ENV: 'development' } });

// Mail: keep every letter; the code is the last 4 digits of the subject («Подтвердите email — 1234»)
const letters = [];
const decodeWords = (s) => s.replace(/=\?utf-8\?([bq])\?([^?]*)\?=/gi, (_, enc, text) =>
  enc.toLowerCase() === 'b'
    ? Buffer.from(text, 'base64').toString('utf8')
    : Buffer.from(text.replace(/_/g, ' ').replace(/=([0-9a-f]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8'));
const codeOf = (raw) => {
  const subject = /^Subject: ((?:.*)(?:\r?\n[ \t].*)*)/mi.exec(raw)?.[1].replace(/\r?\n[ \t]/g, '') ?? '';
  return /(\d{4})\s*$/.exec(decodeWords(subject).replace(/\?=\s+=\?/g, '?==?'))?.[1] ?? null;
};
const smtp = new SMTPServer({
  authOptional: true,
  allowInsecureAuth: true,
  disabledCommands: ['STARTTLS'],
  onAuth: (_auth, _session, cb) => cb(null, { user: 'e2e' }),
  onData(stream, session, cb) {
    let raw = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => (raw += chunk));
    stream.on('end', () => {
      letters.push({ to: session.envelope.rcptTo.map((r) => r.address.toLowerCase()), raw });
      cb();
    });
  },
});
await new Promise((resolve) => smtp.listen(SMTP_PORT, '127.0.0.1', resolve));
const inbox = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://inbox');
  const to = (url.searchParams.get('to') || '').toLowerCase();
  const letter = [...letters].reverse().find((l) => l.to.includes(to));
  const code = letter ? codeOf(letter.raw) : null;
  res.writeHead(code ? 200 : 404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ code }));
});
await new Promise((resolve) => inbox.listen(INBOX_PORT, '127.0.0.1', resolve));

// The app (production build)
const vapid = webpush.generateVAPIDKeys();
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(APP_PORT), '-H', 'localhost'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL,
    NODE_ENV: 'production',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(SMTP_PORT),
    SMTP_USER: 'e2e',
    SMTP_PASS: 'e2e',
    MAIL_FROM: 'Привычка <no-reply@example.com>',
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
  },
});

const stop = async () => {
  app.kill();
  smtp.close();
  inbox.close();
  await dbServer.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
app.on('exit', (code) => process.exit(code ?? 1));
