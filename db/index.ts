// Database access: PostgreSQL through Prisma (schema — prisma/schema.prisma).
//
// Services work with the record types from db/schema.ts: dates as 'YYYY-MM-DD' and ISO strings,
// '' for "no email". The helpers below convert between those records and database rows.
//
// Server-only. Never import this from a client component.

import { PrismaPg } from '@prisma/adapter-pg';
import type { Gender } from '@/lib/shared/types';
import { Prisma, PrismaClient, type Habit, type User } from './generated/client';
import type { HabitRecord, UserRecord } from './schema';

export { Prisma };

const globalForPrisma = globalThis as unknown as { __habitflowPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// One client (and connection pool) per server process; `next dev` reloads modules, so it's kept on globalThis.
export const prisma = (globalForPrisma.__habitflowPrisma ??= createClient());

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids come from URLs and cookies; anything that isn't a UUID can't exist (and Postgres would reject it). */
export const isUuid = (value: string): boolean => UUID_RE.test(value);

/** 'YYYY-MM-DD' → value for a DATE column (Prisma uses UTC midnight for those). */
export const toDbDate = (date: string): Date => new Date(`${date}T00:00:00Z`);

/** DATE column → 'YYYY-MM-DD'. */
export const fromDbDate = (date: Date): string => date.toISOString().slice(0, 10);

// ---------------- Rows → records ----------------

export function toUserRecord(row: User): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    passwordHash: row.passwordHash,
    gender: row.gender as Gender,
    avatar: row.avatar,
    waterGoal: row.waterGoal,
    emailVerified: row.emailVerified,
    codes: row.codes as UserRecord['codes'],
    pendingEmail: row.pendingEmail,
    vkId: row.vkId,
    loginFailures: row.loginFailures,
    lockedUntil: row.lockedUntil?.toISOString() ?? null,
    firstUseDate: fromDbDate(row.firstUseDate),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toHabitRecord(row: Habit): HabitRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    category: row.category as HabitRecord['category'],
    frequency: row.frequency as HabitRecord['frequency'],
    days: row.days,
    reminderTime: row.reminderTime,
    goal: row.goal as HabitRecord['goal'],
    createdAt: row.createdAt.toISOString(),
  };
}

// ---------------- Users ----------------

export type NewUser = Pick<UserRecord, 'name' | 'email' | 'passwordHash' | 'gender' | 'avatar' | 'waterGoal' | 'emailVerified' | 'firstUseDate'>
  & { vkId?: string | null };

export type UserPatch = Partial<Omit<UserRecord, 'id' | 'createdAt'>>;

function toUserData(patch: UserPatch): Prisma.UserUpdateInput {
  const { email, codes, lockedUntil, firstUseDate, ...rest } = patch;
  const data: Prisma.UserUpdateInput = { ...rest };
  if (email !== undefined) data.email = email || null;
  if (codes !== undefined) data.codes = { ...codes } as Prisma.InputJsonObject;
  if (lockedUntil !== undefined) data.lockedUntil = lockedUntil ? new Date(lockedUntil) : null;
  if (firstUseDate !== undefined) data.firstUseDate = toDbDate(firstUseDate);
  return data;
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toUserRecord(row) : undefined;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  if (!email) return undefined;
  const row = await prisma.user.findUnique({ where: { email } });
  return row ? toUserRecord(row) : undefined;
}

export async function findUserByVkId(vkId: string): Promise<UserRecord | undefined> {
  const row = await prisma.user.findUnique({ where: { vkId } });
  return row ? toUserRecord(row) : undefined;
}

export async function createUser(user: NewUser): Promise<UserRecord> {
  const row = await prisma.user.create({
    data: { ...user, email: user.email || null, firstUseDate: toDbDate(user.firstUseDate) },
  });
  return toUserRecord(row);
}

export async function updateUser(id: string, patch: UserPatch): Promise<UserRecord> {
  return toUserRecord(await prisma.user.update({ where: { id }, data: toUserData(patch) }));
}
