import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { isUuid, prisma, toUserRecord } from '@/db';
import type { UserRecord } from '@/db/schema';
import { SESSION_COOKIE } from '@/lib/shared/constants';
import type { UserDTO } from '@/lib/shared/types';
import { ApiError } from './http';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getCurrentUser(): Promise<UserRecord | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !isUuid(token)) return null;
  const session = await prisma.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!session) return null;
  // Sessions expire on the server too, not only in the browser.
  if (Date.now() - session.createdAt.getTime() > SESSION_MAX_AGE * 1000) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return toUserRecord(session.user);
}

export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, 'Войдите в аккаунт, чтобы продолжить', 'unauthorized');
  return user;
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
    avatar: user.avatar,
    waterGoal: user.waterGoal,
    pendingEmail: user.pendingEmail ?? null,
    vkLinked: !!user.vkId,
    hasPassword: !!user.passwordHash,
  };
}
