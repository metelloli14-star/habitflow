import { ApiError, handle, json, readJson } from '@/lib/server/http';
import { limitEmailSends } from '@/lib/server/rateLimit';
import { devCode, findUserByEmail, issueVerificationCode } from '@/lib/server/services/users';
import { validateEmail } from '@/lib/server/validation';

// POST /api/auth/resend  { email } -> { email, devCode? }  (at most once a minute)
export const POST = handle(async (req: Request) => {
  limitEmailSends(req);
  const body = await readJson<Record<string, unknown>>(req);
  const email = validateEmail(body.email);
  const user = await findUserByEmail(email);
  if (!user || user.emailVerified) throw new ApiError(400, 'Этот email не ждёт подтверждения', 'nothing_to_verify');
  return json({ email, ...devCode(await issueVerificationCode(user)) });
});
