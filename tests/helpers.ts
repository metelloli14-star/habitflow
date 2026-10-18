// Shared helpers for integration tests.
import { randomUUID } from 'node:crypto';
import { createUser, prisma } from '@/db';
import type { UserRecord } from '@/db/schema';
import { hashPassword } from '@/lib/server/password';

/** Empties every table (fast; keeps the schema). Call in beforeEach. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE users, sessions, habits, completions, water_entries, push_subscriptions, sent_reminders, sent_notifications, avatars CASCADE',
  );
}

let counter = 0;

/** A confirmed account with password "password123". */
export function makeUser(overrides: Partial<Parameters<typeof createUser>[0]> = {}): Promise<UserRecord> {
  counter += 1;
  return createUser({
    name: 'Тест',
    email: `user${counter}-${Date.now()}@example.com`,
    passwordHash: hashPassword('password123'),
    gender: '',
    waterGoal: 2000,
    emailVerified: true,
    firstUseDate: '2026-01-01',
    ...overrides,
  });
}

/** A login session (as after POST /api/auth/login). */
export function makeSession(userId: string, createdAt = new Date()) {
  return prisma.session.create({ data: { id: randomUUID(), userId, createdAt } });
}
