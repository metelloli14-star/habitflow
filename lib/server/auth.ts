import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { isUuid, prisma, toUserRecord } from '@/db';
import type { UserRecord } from '@/db/schema';
import { SESSION_COOKIE } from '@/lib/shared/constants';
import type { UserDTO } from '@/lib/shared/types';
import { ApiError } from './http';
import { avatarUrl } from './services/avatar';

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Sessions created before this moment have expired. */
export const sessionCutoff = (now = Date.now()) => new Date(now - SESSION_MAX_AGE * 1000);

export async function getCurrentSession(): Promise<{ sessionId: string; user: UserRecord } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !isUuid(token)) return null;
  const session = await prisma.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!session) return null;
  // Sessions expire on the server too, not only in the browser.
  if (session.createdAt < sessionCutoff()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return { sessionId: session.id, user: toUserRecord(session.user) };
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  return (await getCurrentSession())?.user ?? null;
}

export async function requireSession(): Promise<{ sessionId: string; user: UserRecord }> {
  const current = await getCurrentSession();
  if (!current) throw new ApiError(401, 'Войдите в аккаунт, чтобы продолжить', 'unauthorized');
  return current;
}

export async function requireUser(): Promise<UserRecord> {
  return (await requireSession()).user;
}

export async function startSession(userId: string): Promise<void> {
  // The token is generated here (crypto-random UUID), not left to a database default.
  const session = await prisma.session.create({ data: { id: randomUUID(), userId } });
  (await cookies()).set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && isUuid(token)) await prisma.session.deleteMany({ where: { id: token } });
  store.delete(SESSION_COOKIE);
}

export function toUserDTO(user: UserRecord): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    gender: user.gender,
    avatar: avatarUrl(user.avatarVersion),
    waterGoal: user.waterGoal,
    pendingEmail: user.pendingEmail ?? null,
    vkLinked: !!user.vkId,
    hasPassword: !!user.passwordHash,
    waterReminders: user.waterReminders,
    weeklySummary: user.weeklySummary,
  };
}
