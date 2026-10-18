// Web Push (VAPID): the server sends a notification through the browser's push service — Google for
// Chrome/Android, Apple for Safari/iPhone, Mozilla for Firefox — and the phone shows it even when the app is closed.
// The payload is end-to-end encrypted for the device: the push service sees only the subscription address and timing.
//
// .env.local (generate the keys once with `npm run push:keys`):
//   VAPID_PUBLIC_KEY=...   VAPID_PRIVATE_KEY=...   VAPID_SUBJECT=mailto:no-reply@poleznyeprivychki.ru
// Without the keys everything works as before, just without push.

import { sendNotification, WebPushError } from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  /** A newer notification with the same tag replaces the older one instead of piling up. */
  tag?: string;
  /** Page to open when the notification is tapped. */
  url?: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const pushPublicKey = (): string | null => process.env.VAPID_PUBLIC_KEY || null;

export const pushConfigured = (): boolean => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/**
 * The server POSTs to the subscription address, so only https on the standard port with a domain name is accepted:
 * that's what every browser push service uses, and it keeps localhost, IP addresses and other ports out.
 */
export function isValidPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1024) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username || url.password) return false;
  const host = url.hostname;
  if (!host.includes('.') || host.endsWith('.localhost')) return false;
  return !/^[\d.]+$/.test(host) && !host.startsWith('['); // no IP addresses
}

/** 'gone' — the subscription no longer exists (permission revoked, app removed): delete it. */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<'sent' | 'gone' | 'failed'> {
  try {
    await sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      {
        TTL: 60 * 60, // a phone that is offline gets it within an hour; later the reminder is pointless
        urgency: 'high', // delivered right away, even when the phone is idle
        timeout: 10_000,
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT || 'mailto:no-reply@poleznyeprivychki.ru',
          publicKey: process.env.VAPID_PUBLIC_KEY!,
          privateKey: process.env.VAPID_PRIVATE_KEY!,
        },
      },
    );
    return 'sent';
  } catch (err) {
    if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) return 'gone';
    console.error('[push] sending failed:', err instanceof WebPushError ? `${err.statusCode} ${err.body}` : err);
    return 'failed';
  }
}
