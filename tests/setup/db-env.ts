// Runs before every integration test file: points the app's Prisma client at the test database.
import { afterAll, inject } from 'vitest';

process.env.DATABASE_URL = inject('databaseUrl');

afterAll(async () => {
  const { prisma } = await import('@/db');
  await prisma.$disconnect();
});
