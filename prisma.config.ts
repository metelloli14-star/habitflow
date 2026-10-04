import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'prisma/config';

// The Prisma CLI reads the same .env files as Next.js (.env.local and others), so DATABASE_URL lives in one place.
loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Not required for `prisma generate`, so a missing value isn't an error here.
    url: process.env.DATABASE_URL,
  },
});
