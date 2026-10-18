'use client';

import { useCallback, useEffect, useState } from 'react';
import { trackGoal } from '@/lib/client/analytics';
import { disablePush, enablePush, getPushKey, hasPushSubscription, pushSupport } from '@/lib/client/push';

/**
 * on / off — push on this device is on or can be turned on;
 * denied — notifications are blocked in the browser or phone settings;
 * ios-install — iPhone in Safari: the app must be added to the home screen first;
 * ios-update — installed on iPhone, but iOS is older than 16.4;
 * unsupported — the browser has no push; unavailable — push isn't set up on the server.
 */
export type PushStatus = 'loading' | 'on' | 'off' | 'denied' | 'ios-install' | 'ios-update' | 'unsupported' | 'unavailable';

export function usePush() {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const support = pushSupport();
      if (support !== 'supported') return setStatus(support);
      const key = await getPushKey().catch(() => null);
      if (cancelled) return;
      if (!key) return setStatus('unavailable');
      setPublicKey(key);
      if (Notification.permission === 'denied') return setStatus('denied');
      const on = await hasPushSubscription().catch(() => false);
      if (!cancelled) setStatus(on ? 'on' : 'off');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Must be called right from a tap (see enablePush). */
  const enable = useCallback(async () => {
    if (!publicKey || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await enablePush(publicKey);
      if (result === 'on') trackGoal('push_enabled');
      // Closing the permission request without an answer isn't a refusal: the button stays available.
      setStatus(result === 'on' ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Не удалось включить уведомления');
    } finally {
      setBusy(false);
    }
  }, [publicKey, busy]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await disablePush();
      setStatus('off');
    } catch {
      setError('Не удалось отключить уведомления');
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, error, enable, disable };
}
