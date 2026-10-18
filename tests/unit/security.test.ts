import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/server/http';
import { hashPassword, verifyPassword } from '@/lib/server/password';
import { isValidPushEndpoint } from '@/lib/server/push';
import { clientIp, rateLimit } from '@/lib/server/rateLimit';

describe('passwords', () => {
  it('hashes with a random salt and verifies', () => {
    const a = hashPassword('password123');
    const b = hashPassword('password123');
    expect(a).not.toBe(b);
    expect(verifyPassword('password123', a)).toBe(true);
    expect(verifyPassword('password124', a)).toBe(false);
    expect(verifyPassword('anything', '')).toBe(false); // VK ID accounts without a password
  });
});

describe('rate limits', () => {
  it('blocks after the limit within the window and lets through after it', () => {
    const key = `test:${Math.random()}`;
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000, t0 + i);
    expect(() => rateLimit(key, 3, 60_000, t0 + 10)).toThrow(ApiError);
    expect(() => rateLimit(key, 3, 60_000, t0 + 61_000)).not.toThrow();
  });

  it('takes the client IP from the proxy headers', () => {
    expect(clientIp(new Request('http://x', { headers: { 'x-real-ip': '1.2.3.4' } }))).toBe('1.2.3.4');
    expect(clientIp(new Request('http://x', { headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.1' } }))).toBe('5.6.7.8');
    expect(clientIp(new Request('http://x'))).toBe('local');
  });
});

describe('push subscription address', () => {
  it('accepts the browser push services', () => {
    for (const url of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://web.push.apple.com/QGx',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
    ]) expect(isValidPushEndpoint(url)).toBe(true);
  });

  it('refuses addresses the server must never post to', () => {
    for (const url of [
      'http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://localhost/x', 'https://app.localhost/x',
      'https://fcm.googleapis.com:8443/x', 'https://[::1]/x', 'https://user:pw@example.com/x', 'ftp://x.ru/y', 'not a url', 42,
    ]) expect(isValidPushEndpoint(url)).toBe(false);
  });
});
