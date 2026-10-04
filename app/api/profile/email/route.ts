import { requireUser, toUserDTO } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { limitAuthAttempts } from '@/lib/server/rateLimit';
import { cancelEmailChange, confirmEmailChange } from '@/lib/server/services/users';

// POST /api/profile/email  { code } -> UserDTO — confirms the pending new email
export const POST = handle(async (req: Request) => {
  limitAuthAttempts(req);
  const user = await requireUser();
  const body = await readJson<Record<string, unknown>>(req);
  return json(toUserDTO(await confirmEmailChange(user, body.code)));
});

// DELETE /api/profile/email -> UserDTO — cancels the pending change, the current email stays
export const DELETE = handle(async () => json(toUserDTO(await cancelEmailChange(await requireUser()))));
