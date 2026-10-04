import { endSession, requireUser } from '@/lib/server/auth';
import { handle, json } from '@/lib/server/http';
import { deleteAccountData } from '@/lib/server/services/account';

// DELETE /api/account — removes the person and all their data
export const DELETE = handle(async () => {
  const user = await requireUser();
  await endSession();
  deleteAccountData(user.id);
  return json({ ok: true });
});
