// "Install the app" (add to home screen). The installed app opens without the browser's address bar.
// Chrome / Yandex Browser / Edge on Android offer a system install dialog (beforeinstallprompt);
// on iPhone it's done by hand: Share → «На экран „Домой“».

import { trackGoal } from './analytics';
import { isStandalone } from './push';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Called once on app start: keeps the browser's install offer for our own button. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // no browser mini-banner — the app shows its own card
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    trackGoal('app_installed');
    deferred = null;
    notify();
  });
}

export function onInstallChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type InstallWay = 'prompt' | 'ios' | null;

/** How this browser can install the app; null when it's already installed or can't be. */
export function installWay(): InstallWay {
  if (typeof window === 'undefined' || isStandalone()) return null;
  if (deferred) return 'prompt';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // the browser allows using it only once
  await event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === 'accepted';
}
