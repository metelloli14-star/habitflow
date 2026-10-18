// Push notifications on this device: the service worker (public/sw.js), the browser's permission,
// the subscription with the browser's push service and registering it on our server.

import { api } from './api';

/** Set while this device is subscribed — useReminders then leaves system notifications to push. */
const FLAG_KEY = 'habitflow_push';

export type PushSupport = 'supported' | 'ios-install' | 'ios-update' | 'unsupported';

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** iPhone gets push only in the app added to the home screen (iOS 16.4+), never in a Safari tab. */
export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'supported';
  if (!isIos()) return 'unsupported';
  return isStandalone() ? 'ios-update' : 'ios-install';
}

export function markPushOn(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG_KEY, '1');
    else localStorage.removeItem(FLAG_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function isPushMarkedOn(): boolean {
  try {
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[push] service worker not registered:', err));
}

export async function getPushKey(): Promise<string | null> {
  return (await api.get<{ publicKey: string | null }>('/api/push/key')).publicKey;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'supported') return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export const hasPushSubscription = async () => !!(await currentSubscription());

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

const sendToServer = (subscription: PushSubscription) =>
  api.post('/api/push/subscribe', {
    subscription: subscription.toJSON(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

/**
 * Turns push on for this device. Call it right from a tap: iPhone shows the permission request
 * only in response to the person's action, so the key is fetched beforehand (`getPushKey`).
 */
export async function enablePush(publicKey: string): Promise<'on' | 'denied'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  // A subscription made with another server key can't receive our pushes — replace it.
  const key = subscription?.options.applicationServerKey;
  if (subscription && key && !sameBytes(new Uint8Array(key), keyToBytes(publicKey))) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
  await sendToServer(subscription);
  markPushOn(true);
  return 'on';
}

/** Turns push off for this device (on the server and in the browser). */
export async function disablePush(): Promise<void> {
  await api.del('/api/push/subscribe').catch(() => {}); // offline: the server drops it after the next failed send
  await (await currentSubscription())?.unsubscribe();
  markPushOn(false);
}

/** After logging out the device stops receiving reminders; the next person turns them on for themselves. */
export async function forgetPushOnThisDevice(): Promise<void> {
  try {
    await (await currentSubscription())?.unsubscribe();
  } catch {
    /* nothing to forget */
  }
  markPushOn(false);
}

/**
 * On app start: re-sends the existing subscription, so the server knows the current time zone
 * and the subscription follows a new login session. Never asks for permission.
 */
export async function syncPush(): Promise<void> {
  try {
    if (pushSupport() !== 'supported' || Notification.permission !== 'granted') {
      if (isPushMarkedOn() && pushSupport() === 'supported') markPushOn(false);
      return;
    }
    const subscription = await currentSubscription();
    if (subscription) await sendToServer(subscription);
    markPushOn(!!subscription);
  } catch {
    /* offline or logged out — try next time */
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
