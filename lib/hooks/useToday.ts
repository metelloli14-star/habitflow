'use client';

import { useSyncExternalStore } from 'react';
import { todayStr } from '@/lib/shared/dates';

// Re-checked every 30 s, so the day changes by itself at midnight while the app is open.
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
};

/**
 * The person's local calendar day ('YYYY-MM-DD'). null only while the page is rendered on the server
 * and hydrated, so date-based data starts loading in the browser (no timezone mismatch).
 * Screens opened later get the date right away — and show cached data on their first frame instead of blinking.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, todayStr, () => null);
}
