import { startSession, toUserDTO } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { limitAuthAttempts } from '@/lib/server/rateLimit';
import { resetPassword } from '@/lib/server/services/users';
import { validateEmail, validatePassword } from '@/lib/server/validation';

// POST /api/auth/password/reset  { email, code, password } -> UserDTO (signs in; other devices are signed out)
export const POST = handle(async (req: Request) => {
  limitAuthAttempts(req);
  const body = await readJson<Record<string, unknown>>(req);
  const password = validatePassword(body.password);
  const user = resetPassword(validateEmail(body.email), body.code, password);
  await startSession(user.id);
  return json(toUserDTO(user));
});
