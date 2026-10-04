// One-time email codes for three purposes: confirming registration, resetting the password,
// and confirming a new email. Same protection everywhere: the code expires, has a limited number
// of attempts, and can be re-sent at most once a minute.

import { randomInt } from 'node:crypto';
import { findUserById, updateUser } from '@/db';
import type { CodePurpose, UserRecord } from '@/db/schema';
import { codeEmail } from '../emails';
import { ApiError } from '../http';
import { mailerConfigured, sendMail } from '../mailer';

export const CODE_TTL_MS = 15 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;

/** In development without SMTP the code is also returned to the client, so you can test without an inbox. */
export function devCode(code: string | null): { devCode?: string } {
  return process.env.NODE_ENV === 'production' || mailerConfigured() || !code ? {} : { devCode: code };
}

/**
 * Creates a fresh code and emails it. Throws 429 if one for the same purpose was sent less than a minute ago.
 * The code is saved only after the letter went out, so a failed send doesn't trigger the cooldown.
 */
export async function issueCode(user: UserRecord, purpose: CodePurpose, sendTo: string, now = Date.now()): Promise<string> {
  const current = user.codes?.[purpose];
  if (current && now - Date.parse(current.sentAt) < RESEND_COOLDOWN_MS) {
    throw new ApiError(429, 'Код уже отправлен. Запросить новый можно через минуту', 'resend_cooldown');
  }
  const code = String(randomInt(0, 10_000)).padStart(4, '0');
  await sendMail(codeEmail(sendTo, purpose, code, CODE_TTL_MS / 60_000));
  const latest = (await findUserById(user.id))?.codes ?? user.codes;
  await updateUser(user.id, {
    codes: {
      ...latest,
      [purpose]: {
        code,
        sentTo: sendTo,
        expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
        sentAt: new Date(now).toISOString(),
        attempts: 0,
      },
    },
  });
  return code;
}

/** Checks a code. On success the code is used up; otherwise throws a clear error and counts the attempt. */
export async function consumeCode(user: UserRecord, purpose: CodePurpose, code: unknown, now = Date.now()): Promise<void> {
  const current = user.codes?.[purpose];
  if (!current || now > Date.parse(current.expiresAt)) {
    throw new ApiError(400, 'Срок действия кода истёк. Отправьте новый код', 'code_expired');
  }
  if (current.attempts >= MAX_CODE_ATTEMPTS) {
    throw new ApiError(429, 'Слишком много неверных попыток. Отправьте новый код', 'too_many_attempts');
  }
  if (typeof code !== 'string' || code !== current.code) {
    await updateUser(user.id, { codes: { ...user.codes, [purpose]: { ...current, attempts: current.attempts + 1 } } });
    const left = MAX_CODE_ATTEMPTS - current.attempts - 1;
    throw new ApiError(400, left > 0
      ? `Неверный код. Осталось попыток: ${left}`
      : 'Неверный код. Попытки закончились — отправьте новый код', 'invalid_code');
  }
  const rest = { ...user.codes };
  delete rest[purpose];
  await updateUser(user.id, { codes: rest });
}
