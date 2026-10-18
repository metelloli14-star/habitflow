// Service worker «Привычки»: показывает push-напоминания, даже когда приложение закрыто.
// Ничего не кэширует — страницы и данные всегда берутся с сервера.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Привычка', {
      body: data.body || '',
      tag: data.tag,
      icon: '/icons/icon-192.png',
      badge: '/badge.png',
      lang: 'ru',
      data: { url: data.url || '/home' },
    }),
  );
});

// Tap on the notification: bring the open app forward, or open it.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/home', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (!open) return self.clients.openWindow(url);
      await open.focus();
      if (open.url !== url && 'navigate' in open) await open.navigate(url).catch(() => {});
    })(),
  );
});

// The browser may replace the subscription (e.g. expired keys) — register the new one on the server.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const { publicKey } = await fetch('/api/push/key').then((r) => r.json());
      if (!publicKey) return;
      const subscription = event.newSubscription
        || (await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
      await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
    })(),
  );
});

function keyToBytes(base64url) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
