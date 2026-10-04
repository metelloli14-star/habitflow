import { db } from '@/db';
import type { UserRecord } from '@/db/schema';
import { DEFAULT_WATER_GOAL } from '@/lib/shared/constants';
import { ApiError } from '../http';
import { hashPassword, verifyPassword } from '../password';
import type { VkProfile } from '../vkid';
import { consumeCode, issueCode } from './codes';

export { devCode } from './codes';

export const MAX_LOGIN_FAILURES = 5;         // wrong passwords in a row…
export const LOGIN_LOCK_MS = 15 * 60 * 1000; // …block login for 15 minutes

export const NEW_USER_DEFAULTS = {
  gender: '' as const,
  avatar: null,
  waterGoal: DEFAULT_WATER_GOAL,
};

export function findUserByEmail(email: string): UserRecord | undefined {
  return db.users.findOne((u) => u.email === email);
}

// ---------------- Registration: confirm email ----------------

export function issueVerificationCode(user: UserRecord, now = Date.now()): Promise<string> {
  return issueCode(user, 'verify', user.email, now);
}

/** Checks the registration code. Returns the confirmed user or throws a clear error. */
export function confirmEmailCode(email: string, code: unknown, today: string, now = Date.now()): UserRecord {
  const user = findUserByEmail(email);
  if (!user) throw new ApiError(404, 'Аккаунт не найден. Зарегистрируйтесь заново', 'not_found');
  // A confirmed account is only entered with the password — never through this endpoint.
  if (user.emailVerified) throw new ApiError(400, 'Email уже подтверждён. Войдите с паролем', 'already_verified');
  consumeCode(user, 'verify', code, now);
  return db.users.update(user.id, { emailVerified: true, firstUseDate: today })!;
}

// ---------------- Login ----------------

/** Checks email + password with a temporary lock after repeated failures. */
export function checkCredentials(email: string, password: string, now = Date.now()): UserRecord {
  const user = findUserByEmail(email);
  // Same message whether the email exists or not, so accounts can't be discovered through this form.
  const invalid = new ApiError(401, 'Неверный email или пароль', 'invalid_credentials');
  if (!user) throw invalid;
  if (user.lockedUntil && now < Date.parse(user.lockedUntil)) {
    const minutes = Math.ceil((Date.parse(user.lockedUntil) - now) / 60_000);
    throw new ApiError(429, `Слишком много попыток входа. Попробуйте через ${minutes} мин. или восстановите пароль`, 'login_locked');
  }
  if (!verifyPassword(password, user.passwordHash)) {
    const failures = (user.loginFailures ?? 0) + 1;
    if (failures >= MAX_LOGIN_FAILURES) {
      db.users.update(user.id, { loginFailures: 0, lockedUntil: new Date(now + LOGIN_LOCK_MS).toISOString() });
      throw new ApiError(429, 'Слишком много попыток входа. Попробуйте через 15 мин. или восстановите пароль', 'login_locked');
    }
    db.users.update(user.id, { loginFailures: failures });
    throw invalid;
  }
  if (user.loginFailures || user.lockedUntil) db.users.update(user.id, { loginFailures: 0, lockedUntil: null });
  return user;
}

// ---------------- Forgot password ----------------

/**
 * Sends a reset code if the account exists. Returns the code (for dev) or null.
 * The API answers the same way either way, so nobody can find out which emails are registered.
 */
export async function requestPasswordReset(email: string, now = Date.now()): Promise<string | null> {
  const user = findUserByEmail(email);
  if (!user) return null;
  try {
    return await issueCode(user, 'reset', user.email, now);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'resend_cooldown') return null; // a code was just sent
    throw err;
  }
}

/** Sets a new password with the emailed code, unlocks login and signs out every other device. */
export function resetPassword(email: string, code: unknown, newPassword: string, now = Date.now()): UserRecord {
  const user = findUserByEmail(email);
  if (!user) throw new ApiError(400, 'Срок действия кода истёк. Отправьте новый код', 'code_expired');
  consumeCode(user, 'reset', code, now);
  db.sessions.removeWhere((s) => s.userId === user.id);
  // Receiving the code proves the person owns the address, so it also counts as email confirmation.
  return db.users.update(user.id, {
    passwordHash: hashPassword(newPassword),
    emailVerified: true,
    loginFailures: 0,
    lockedUntil: null,
  })!;
}

// ---------------- Change email ----------------

/**
 * Starts an email change: the new address gets a code, the current one keeps working until it's confirmed.
 * Returns the code (for dev) or null when nothing needs to be sent.
 */
export async function requestEmailChange(user: UserRecord, newEmail: string, now = Date.now()): Promise<string | null> {
  if (newEmail === user.email) {
    // Typed the current address back — cancel any pending change.
    if (user.pendingEmail) cancelEmailChange(user);
    return null;
  }
  const owner = findUserByEmail(newEmail);
  if (owner && owner.id !== user.id) throw new ApiError(409, 'Этот email уже занят', 'email_taken');
  const active = user.codes?.email;
  if (user.pendingEmail === newEmail && active && now < Date.parse(active.expiresAt)) return null; // already sent
  // Send first: if the letter can't be sent, the profile isn't left waiting for a code that never came.
  const code = await issueCode(user, 'email', newEmail, now);
  db.users.update(user.id, { pendingEmail: newEmail });
  return code;
}

export function resendEmailChange(user: UserRecord, now = Date.now()): Promise<string> {
  if (!user.pendingEmail) throw new ApiError(400, 'Нет нового email, ожидающего подтверждения', 'nothing_to_confirm');
  return issueCode(user, 'email', user.pendingEmail, now);
}

export function confirmEmailChange(user: UserRecord, code: unknown, now = Date.now()): UserRecord {
  if (!user.pendingEmail) throw new ApiError(400, 'Нет нового email, ожидающего подтверждения', 'nothing_to_confirm');
  consumeCode(user, 'email', code, now);
  const owner = findUserByEmail(user.pendingEmail);
  if (owner && owner.id !== user.id) {
    db.users.update(user.id, { pendingEmail: null });
    throw new ApiError(409, 'Этот email уже занят', 'email_taken');
  }
  return db.users.update(user.id, { email: user.pendingEmail, pendingEmail: null })!;
}

export function cancelEmailChange(user: UserRecord): UserRecord {
  const codes = { ...user.codes };
  delete codes.email;
  return db.users.update(user.id, { pendingEmail: null, codes })!;
}

// ---------------- VK ID ----------------


export function findUserByVkId(vkId: string): UserRecord | undefined {
  return db.users.findOne((u) => u.vkId === vkId);
}

/**
 * Login with VK ID: the linked account, or a new account created from the VK profile.
 * An existing account with the same email is NOT merged automatically (that would let anyone whose
 * VK profile shows your address into your account) — the person logs in with the password and links VK ID in the profile.
 */
export function loginWithVk(profile: VkProfile, today: string): { user: UserRecord; created: boolean } {
  const linked = findUserByVkId(profile.vkId);
  if (linked) return { user: linked, created: false };
  if (profile.email && findUserByEmail(profile.email)) {
    throw new ApiError(409,
      `Аккаунт с email ${profile.email} уже есть. Войдите по паролю и привяжите VK ID в личном кабинете`, 'vk_email_exists');
  }
  const user = db.users.insert({
    ...NEW_USER_DEFAULTS,
    name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Пользователь',
    email: profile.email ?? '',
    passwordHash: '',
    emailVerified: !!profile.email, // VK ID only shares addresses its users have confirmed
    vkId: profile.vkId,
    firstUseDate: today,
    createdAt: new Date().toISOString(),
  });
  return { user, created: true };
}

export function linkVk(user: UserRecord, profile: VkProfile): UserRecord {
  const other = findUserByVkId(profile.vkId);
  if (other && other.id !== user.id) throw new ApiError(409, 'Этот VK ID уже привязан к другому аккаунту', 'vk_taken');
  return db.users.update(user.id, { vkId: profile.vkId })!;
}

/** Unlinking is only allowed when the person can still log in another way. */
export function unlinkVk(user: UserRecord): UserRecord {
  if (!user.email || !user.passwordHash) {
    throw new ApiError(400,
      'Сначала задайте email и пароль (email — в личном кабинете, пароль — через «Забыли пароль?»), иначе после отвязки войти будет нельзя',
      'vk_only_login');
  }
  return db.users.update(user.id, { vkId: null })!;
}
