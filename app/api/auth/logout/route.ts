import { endSession } from '@/lib/server/auth';
import { handle, json } from '@/lib/server/http';

// POST /api/auth/logout
export const POST = handle(async () => {
  await endSession();
  return json({ ok: true });
});
