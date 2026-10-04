import { prisma } from '@/db';

/** Removes the person and everything that belongs to them (sessions, habits, history and water cascade in the database). */
export async function deleteAccountData(userId: string): Promise<void> {
  await prisma.user.deleteMany({ where: { id: userId } });
}
