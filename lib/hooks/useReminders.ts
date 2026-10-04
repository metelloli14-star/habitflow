'use client';

import { useCallback, useEffect, useState } from 'react';
import { isHabitScheduledOn, todayStr } from '@/lib/shared/dates';
import type { HabitDTO } from '@/lib/shared/types';

const SENT_KEY = 'habitflow_reminders_sent';
const WINDOW_MINUTES = 30;

function readSent(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** Asks for notification permission (call it when the person sets a reminder time). */
export function requestReminderPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
  } catch {
    /* not supported */
  }
}

/**
 * Watches habits with a reminder time. When it's time (or within 30 min after, e.g. the app was just opened)
 * and the habit isn't done yet, returns it as `due` and shows a system notification if allowed.
 * Each habit reminds at most once per day. Works while the app is open, including in a background tab;
 * reminders with the app fully closed will need a service worker + push server.
 */
export function useReminders(habits: HabitDTO[]) {
  const [due, setDue] = useState<HabitDTO | null>(null);

  const check = useCallback(() => {
    const today = todayStr();
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const sent = readSent();
    for (const h of habits) {
      if (!h.reminderTime || h.doneToday || sent[h.id] === today || !isHabitScheduledOn(h, today)) continue;
      const [hh, mm] = h.reminderTime.split(':').map(Number);
      const diff = nowMin - (hh * 60 + mm);
      if (diff < 0 || diff > WINDOW_MINUTES) continue;
      sent[h.id] = today;
      localStorage.setItem(SENT_KEY, JSON.stringify(sent));
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Привычка', { body: `Пора: ${h.title}` });
        }
      } catch {
        /* not supported */
      }
      setDue(h);
      break;
    }
  }, [habits]);

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [check]);

  return { due, dismiss: () => setDue(null) };
}
