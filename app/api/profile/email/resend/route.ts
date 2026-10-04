import { requireUser } from '@/lib/server/auth';
import { handle, json } from '@/lib/server/http';
import { limitEmailSends } from '@/lib/server/rateLimit';
import { devCode, resendEmailChange } from '@/lib/server/services/users';

// POST /api/profile/email/resend -> { ok, devCode? }  (at most once a minute)
export const POST = handle(async (req: Request) => {
  limitEmailSends(req);
  const user = await requireUser();
  return json({ ok: true, ...devCode(await resendEmailChange(user)) });
});
