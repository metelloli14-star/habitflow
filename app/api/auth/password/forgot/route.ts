import { handle, json, readJson } from '@/lib/server/http';
import { limitEmailSends } from '@/lib/server/rateLimit';
import { devCode, requestPasswordReset } from '@/lib/server/services/users';
import { validateEmail } from '@/lib/server/validation';

// POST /api/auth/password/forgot  { email } -> { ok, devCode? }
// Always the same answer, whether or not the email is registered.
export const POST = handle(async (req: Request) => {
  limitEmailSends(req);
  const body = await readJson<Record<string, unknown>>(req);
  const code = await requestPasswordReset(validateEmail(body.email));
  return json({ ok: true, ...devCode(code) });
});
