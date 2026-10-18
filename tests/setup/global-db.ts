// Starts an in-memory PostgreSQL (PGlite) reachable over TCP and applies the Prisma migrations,
// so integration tests run against the real schema without installing PostgreSQL.

import { execFile } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

export default async function setup(project: TestProject) {
  const db = await PGlite.create();
  const port = await freePort();
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 50 });
  await server.start();
  const url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`;

  // Async on purpose: the database lives in this very process and must keep answering while migrations run.
  await promisify(execFile)('npx', ['prisma', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url } });
  project.provide('databaseUrl', url);

  return async () => {
    await server.stop();
    await db.close();
  };
}
