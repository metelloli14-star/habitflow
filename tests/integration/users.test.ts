import { beforeEach, describe, expect, it } from 'vitest';
import { findUserByEmail, prisma } from '@/db';
import { ApiError } from '@/lib/server/http';
import { deleteAccountData } from '@/lib/server/services/account';
import {
  cancelEmailChange, checkCredentials, confirmEmailChange, confirmEmailCode, issueVerificationCode, linkVk, loginWithVk,
  requestEmailChange, requestPasswordReset, resetPassword, unlinkVk, MAX_LOGIN_FAILURES,
} from '@/lib/server/services/users';
import { makeSession, makeUser, resetDb } from '../helpers';

const errorCode = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    return err instanceof ApiError ? err.code : String(err);
  }
  return 'no-error';
};

beforeEach(resetDb);

describe('registration', () => {
  it('confirms the email with the code; wrong codes are counted', async () => {
    const user = await makeUser({ emailVerified: false });
    const code = await issueVerificationCode(user, Date.now() - 61_000);
    const wrong = code === '0000' ? '1111' : '0000';
    expect(await errorCode(confirmEmailCode(user.email, wrong, '2026-10-18'))).toBe('invalid_code');
    const fresh = (await findUserByEmail(user.email))!;
    expect(fresh.codes?.verify?.attempts).toBe(1);
    const confirmed = await confirmEmailCode(user.email, code, '2026-10-18');
    expect(confirmed.emailVerified).toBe(true);
    expect(confirmed.firstUseDate).toBe('2026-10-18');
    expect(confirmed.codes?.verify).toBeUndefined();
  });

  it('a code can be re-sent only once a minute', async () => {
    const user = await makeUser({ emailVerified: false });
    await issueVerificationCode(user);
    const again = (await findUserByEmail(user.email))!;
    expect(await errorCode(issueVerificationCode(again))).toBe('resend_cooldown');
  });

  it('an expired code is refused', async () => {
    const user = await makeUser({ emailVerified: false });
    const code = await issueVerificationCode(user, Date.now() - 16 * 60_000);
    expect(await errorCode(confirmEmailCode(user.email, code, '2026-10-18'))).toBe('code_expired');
  });
});

describe('login', () => {
  it('accepts the right password and refuses a wrong one', async () => {
    const user = await makeUser();
    expect((await checkCredentials(user.email, 'password123')).id).toBe(user.id);
    expect(await errorCode(checkCredentials(user.email, 'nope-nope'))).toBe('invalid_credentials');
    expect(await errorCode(checkCredentials('ghost@example.com', 'password123'))).toBe('invalid_credentials');
  });

  it(`locks login after ${MAX_LOGIN_FAILURES} wrong passwords`, async () => {
    const user = await makeUser();
    for (let i = 0; i < MAX_LOGIN_FAILURES - 1; i++) await errorCode(checkCredentials(user.email, 'wrong-pass'));
    expect(await errorCode(checkCredentials(user.email, 'wrong-pass'))).toBe('login_locked');
    expect(await errorCode(checkCredentials(user.email, 'password123'))).toBe('login_locked');
  });
});

describe('password reset', () => {
  it('sets a new password and signs out every device', async () => {
    const user = await makeUser();
    await makeSession(user.id);
    const code = (await requestPasswordReset(user.email))!;
    await resetPassword(user.email, code, 'brand-new-pass');
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    expect((await checkCredentials(user.email, 'brand-new-pass')).id).toBe(user.id);
  });

  it('answers the same for unknown emails (no account discovery)', async () => {
    expect(await requestPasswordReset('nobody@example.com')).toBeNull();
  });
});

describe('email change', () => {
  it('keeps the old email until the new one is confirmed', async () => {
    const user = await makeUser();
    const code = (await requestEmailChange(user, 'new@example.com'))!;
    const pending = (await findUserByEmail(user.email))!;
    expect(pending.pendingEmail).toBe('new@example.com');
    const changed = await confirmEmailChange(pending, code);
    expect(changed.email).toBe('new@example.com');
    expect(changed.pendingEmail).toBeNull();
  });

  it('refuses an email that belongs to someone else and can be cancelled', async () => {
    const other = await makeUser();
    const user = await makeUser();
    expect(await errorCode(requestEmailChange(user, other.email))).toBe('email_taken');
    await requestEmailChange(user, 'x@example.com');
    const cancelled = await cancelEmailChange((await findUserByEmail(user.email))!);
    expect(cancelled.pendingEmail).toBeNull();
  });
});

describe('VK ID', () => {
  const profile = { vkId: 'vk-1', firstName: 'Иван', lastName: 'Петров', email: null };

  it('creates an account once, then logs into it; email may be missing', async () => {
    const first = await loginWithVk(profile, '2026-10-18');
    expect(first.created).toBe(true);
    expect(first.user.email).toBe('');
    const second = await loginWithVk(profile, '2026-10-18');
    expect(second).toMatchObject({ created: false, user: { id: first.user.id } });
    // several VK accounts without email can coexist
    expect((await loginWithVk({ ...profile, vkId: 'vk-2' }, '2026-10-18')).created).toBe(true);
  });

  it('does not merge with an existing email account automatically', async () => {
    const user = await makeUser();
    expect(await errorCode(loginWithVk({ ...profile, email: user.email }, '2026-10-18'))).toBe('vk_email_exists');
  });

  it('link and unlink; unlinking needs another way to log in', async () => {
    const user = await makeUser();
    const linked = await linkVk(user, profile);
    expect(linked.vkId).toBe('vk-1');
    expect((await unlinkVk(linked)).vkId).toBeNull();
    const vkOnly = (await loginWithVk({ ...profile, vkId: 'vk-3' }, '2026-10-18')).user;
    expect(await errorCode(unlinkVk(vkOnly))).toBe('vk_only_login');
  });
});

describe('account deletion', () => {
  it('removes the person and everything they own', async () => {
    const user = await makeUser();
    await makeSession(user.id);
    await prisma.habit.create({ data: { userId: user.id, title: 'x', category: 'Хобби', frequency: 'Ежедневно' } });
    await deleteAccountData(user.id);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.session.count()).toBe(0);
    expect(await prisma.habit.count()).toBe(0);
  });
});
