import { startSession, toUserDTO } from '@/lib/server/auth';
import { handle, json, readJson, requestDate } from '@/lib/server/http';
import { limitAuthAttempts } from '@/lib/server/rateLimit';
import { confirmEmailCode } from '@/lib/server/services/users';
import { validateEmail } from '@/lib/server/validation';

// POST /api/auth/verify  { email, code } -> UserDTO (and sets the session cookie).
// Only for accounts that aren't confirmed yet; codes expire and have a limited number of attempts.
export const POST = handle(async (req: Request) => {
  limitAuthAttempts(req);
  const body = await readJson<Record<string, unknown>>(req);
  const user = confirmEmailCode(validateEmail(body.email), body.code, requestDate(req));
  await startSession(user.id);
  return json(toUserDTO(user));
});
