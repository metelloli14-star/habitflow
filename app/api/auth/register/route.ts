import { createUser, updateUser } from '@/db';
import { ApiError, handle, json, readJson, requestDate } from '@/lib/server/http';
import { limitEmailSends } from '@/lib/server/rateLimit';
import { hashPassword } from '@/lib/server/password';
import { devCode, findUserByEmail, issueVerificationCode, NEW_USER_DEFAULTS } from '@/lib/server/services/users';
import { validateEmail, validateName, validatePassword } from '@/lib/server/validation';

// POST /api/auth/register  { name, email, password } -> { email, devCode? }
export const POST = handle(async (req: Request) => {
  limitEmailSends(req);
  const body = await readJson<Record<string, unknown>>(req);
  const name = validateName(body.name);
  const email = validateEmail(body.email);
  const password = validatePassword(body.password);

  const existing = await findUserByEmail(email);
  if (existing?.emailVerified) throw new ApiError(409, 'Аккаунт с таким email уже есть. Войдите в него', 'email_taken');

  const user = existing
    ? await updateUser(existing.id, { name, passwordHash: hashPassword(password) }) // registered before, never confirmed
    : await createUser({
        ...NEW_USER_DEFAULTS,
        name,
        email,
        passwordHash: hashPassword(password),
        emailVerified: false,
        firstUseDate: requestDate(req),
      });
  const code = await issueVerificationCode(user);
  return json({ email, ...devCode(code) }, 201);
});
