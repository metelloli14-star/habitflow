'use client';

import { useEffect, useState } from 'react';
import { todayStr } from '@/lib/shared/dates';

/**
 * The person's local calendar day ('YYYY-MM-DD'). null during the first (server) render,
 * so data keys that include the date only start fetching in the browser — no timezone mismatch.
 * Updates by itself when the day changes while the app is open.
 */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(todayStr());
    const id = setInterval(() => setToday((prev) => (prev === todayStr() ? prev : todayStr())), 30_000);
    return () => clearInterval(id);
  }, []);
  return today;
}
