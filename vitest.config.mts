import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// `npm test` runs two sets:
//   unit        — pure logic, no database;
//   integration — services against a real PostgreSQL (PGlite, started by tests/setup/global-db.ts
//                 with all Prisma migrations applied, exactly like `npm run db:deploy` on the server).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['tests/setup/global-db.ts'],
          setupFiles: ['tests/setup/db-env.ts'],
          fileParallelism: false, // one shared database
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
