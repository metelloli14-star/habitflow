// Push subscriptions: one per device, tied to the login session that turned notifications on.
// Logging out (or a password reset that signs out other devices) deletes the session — and with it the subscription.

import { prisma, updateUser } from '@/db';
import { isValidTimeZone } from '@/lib/shared/dates';
import { ApiError } from '../http';
import { isValidPushEndpoint, pushConfigured } from '../push';

const KEY_RE = /^[A-Za-z0-9_-]{16,128}={0,2}$/;

/** Saves the browser's subscription (PushSubscription.toJSON()) for this session and remembers the person's time zone. */
export async function savePushSubscription(sessionId: string, userId: string, subscription: unknown, timeZone: unknown): Promise<void> {
  if (!pushConfigured()) throw new ApiError(503, 'Уведомления пока не настроены на сервере', 'push_unavailable');
  const sub = (subscription ?? {}) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const { p256dh, auth } = sub.keys ?? {};
  if (!isValidPushEndpoint(sub.endpoint) || typeof p256dh !== 'string' || typeof auth !== 'string'
    || !KEY_RE.test(p256dh) || !KEY_RE.test(auth)) {
    throw new ApiError(400, 'Некорректная подписка на уведомления', 'invalid_subscription');
  }
  const endpoint = sub.endpoint;
  // The same browser may have been subscribed under another login — it now belongs to this session.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { sessionId, endpoint, p256dh, auth },
    update: { sessionId, p256dh, auth },
  });
  // One device = one subscription: a replaced subscription of this session is dropped.
  await prisma.pushSubscription.deleteMany({ where: { sessionId, endpoint: { not: endpoint } } });
  if (isValidTimeZone(timeZone)) await updateUser(userId, { timeZone });
}

export async function removePushSubscription(sessionId: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { sessionId } });
}
