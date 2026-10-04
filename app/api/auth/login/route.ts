import { startSession, toUserDTO } from '@/lib/server/auth';
import { ApiError, handle, json, readJson } from '@/lib/server/http';
import { limitAuthAttempts, limitEmailSends } from '@/lib/server/rateLimit';
import { checkCredentials, devCode, issueVerificationCode } from '@/lib/server/services/users';
import { validateEmail } from '@/lib/server/validation';

// POST /api/auth/login  { email, password } -> UserDTO (and sets the session cookie)
export const POST = handle(async (req: Request) => {
  limitAuthAttempts(req);
  const body = await readJson<Record<string, unknown>>(req);
  const email = validateEmail(body.email);
  const user = await checkCredentials(email, typeof body.password === 'string' ? body.password : '');
  if (!user.emailVerified) {
    let code: string | null = null;
    try {
      limitEmailSends(req);
      code = await issueVerificationCode(user);
    } catch (err) {
      if (!(err instanceof ApiError && (err.code === 'resend_cooldown' || err.code === 'rate_limited'))) throw err; // a code was just sent — reuse it
    }
    return json({ error: 'Подтвердите email, чтобы войти', code: 'email_not_verified', email, ...devCode(code) }, 403);
  }
  await startSession(user.id);
  return json(toUserDTO(user));
});
