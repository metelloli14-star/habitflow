'use client';

import { useEffect } from 'react';
import { captureInstallPrompt } from '@/lib/client/install';
import { registerServiceWorker } from '@/lib/client/push';

/** Registers the service worker (push reminders) and keeps the browser's "install app" offer for our own button. */
export function PwaSetup() {
  useEffect(() => {
    registerServiceWorker();
    captureInstallPrompt();
  }, []);
  return null;
}
