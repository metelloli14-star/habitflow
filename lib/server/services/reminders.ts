// Push notifications sent by the server. Once a minute it checks, in each person's own time zone:
// - habit reminders — at the habit's reminder time, unless it's already done;
// - water — every 2 hours from 10:00 to 20:00, while the daily goal isn't reached (can be turned off);
// - weekly summary — Sundays at 20:00 (can be turned off).
// Each notification goes out once (sent_reminders / sent_notifications), even after a restart.
// The scheduler runs inside the server process (see instrumentation.ts).

import { prisma, toDbDate } from '@/db';
import { addDays, isHabitScheduledOn, startOfWeek, toDateStr, weekdayLabel, zonedNow } from '@/lib/shared/dates';
import type { Frequency } from '@/lib/shared/types';
import { sessionCutoff } from '../auth';
import { pushConfigured, sendPush, type PushPayload, type PushTarget } from '../push';

/** A notification missed by up to this many minutes (server restart, app updated) is still sent. */
export const CATCH_UP_MINUTES = 10;
/** Local hours of the water reminders. */
export const WATER_HOURS = [10, 12, 14, 16, 18, 20];
/** Weekly summary: Sunday at this local hour. */
export const WEEKLY_SUMMARY_HOUR = 20;

interface ReminderHabit {
  frequency: string;
  days: string[];
  reminderTime: string;
  createdAt: Date;
}

type Device = PushTarget & { id: string };

/** Whether local time (minutes since midnight) is at `at` or up to CATCH_UP_MINUTES after it. */
const withinWindow = (minutesNow: number, at: number) => minutesNow - at >= 0 && minutesNow - at <= CATCH_UP_MINUTES;

/** Whether the habit's reminder is due at `now` in `timeZone` (on its scheduled days, within the catch-up window). */
export function isReminderDue(habit: ReminderHabit, timeZone: string, now: Date): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(habit.reminderTime);
  if (!match) return false;
  const local = zonedNow(timeZone, now);
  if (!isHabitScheduledOn({ frequency: habit.frequency as Frequency, days: habit.days }, local.date)) return false;
  const at = Number(match[1]) * 60 + Number(match[2]);
  if (!withinWindow(local.minutes, at)) return false;
  // A habit created today after its reminder time doesn't buzz right away.
  const created = zonedNow(timeZone, habit.createdAt);
  return !(created.date === local.date && created.minutes > at);
}

/** Key of the water reminder due now ('water-14'), or null. */
export function dueWaterSlot(timeZone: string, now: Date): string | null {
  const { minutes } = zonedNow(timeZone, now);
  const hour = WATER_HOURS.find((h) => withinWindow(minutes, h * 60));
  return hour === undefined ? null : `water-${hour}`;
}

export function isWeeklySummaryDue(timeZone: string, now: Date): boolean {
  const { date, minutes } = zonedNow(timeZone, now);
  return weekdayLabel(date) === 'Вс' && withinWindow(minutes, WEEKLY_SUMMARY_HOUR * 60);
}

const liters = (ml: number) => (ml / 1000).toFixed(1).replace('.', ',');

/** Devices (push subscriptions) of people whose login is still valid, grouped by user. */
async function devicesByUser(now: Date): Promise<Map<string, Device[]>> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { session: { createdAt: { gte: sessionCutoff(now.getTime()) } } },
    select: { id: true, endpoint: true, p256dh: true, auth: true, session: { select: { userId: true } } },
  });
  const devices = new Map<string, Device[]>();
  for (const { session, ...sub } of subscriptions) {
    devices.set(session.userId, [...(devices.get(session.userId) ?? []), sub]);
  }
  return devices;
}

/** Sends to all the person's devices; drops the ones the push service says are gone. */
async function deliver(devices: Map<string, Device[]>, userId: string, payload: PushPayload) {
  const targets = devices.get(userId) ?? [];
  const results = await Promise.all(targets.map((t) => sendPush(t, payload)));
  const gone = targets.filter((_, i) => results[i] === 'gone').map((t) => t.id);
  if (gone.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
    devices.set(userId, targets.filter((t) => !gone.includes(t.id)));
  }
}

/** Marks a water/weekly notification as sent; false if it already was (another tick, another process). */
async function claim(userId: string, key: string, date: string): Promise<boolean> {
  const { count } = await prisma.sentNotification.createMany({ data: [{ userId, key, date: toDbDate(date) }], skipDuplicates: true });
  return count === 1;
}

/** Sends the habit reminders that are due. Returns how many habits were reminded about. */
export async function sendDueReminders(now = new Date()): Promise<number> {
  if (!pushConfigured()) return 0;
  const devices = await devicesByUser(now);
  if (devices.size === 0) return 0;

  const users = await prisma.user.findMany({
    where: { id: { in: [...devices.keys()] } },
    select: {
      id: true,
      timeZone: true,
      habits: {
        where: { reminderTime: { not: '' } },
        select: { id: true, title: true, frequency: true, days: true, reminderTime: true, createdAt: true },
      },
    },
  });

  let reminded = 0;
  for (const user of users) {
    const due = user.habits.filter((h) => isReminderDue(h, user.timeZone, now));
    if (due.length === 0) continue;
    const day = toDbDate(zonedNow(user.timeZone, now).date);
    const done = await prisma.completion.findMany({
      where: { habitId: { in: due.map((h) => h.id) }, date: day },
      select: { habitId: true },
    });
    const doneIds = new Set(done.map((c) => c.habitId));

    for (const habit of due) {
      if (doneIds.has(habit.id)) continue;
      // Claim the reminder first: the (habit, day) key lets it go out only once.
      const claimed = await prisma.sentReminder.createMany({ data: [{ habitId: habit.id, date: day }], skipDuplicates: true });
      if (claimed.count === 0) continue;
      await deliver(devices, user.id, { title: 'Привычка', body: `Пора: ${habit.title}`, tag: `habit-${habit.id}`, url: '/home' });
      reminded++;
    }
  }
  return reminded;
}

/** "Пора выпить воды" for people who haven't reached today's goal yet. Returns how many were sent. */
export async function sendWaterReminders(now = new Date()): Promise<number> {
  if (!pushConfigured()) return 0;
  const devices = await devicesByUser(now);
  if (devices.size === 0) return 0;
  const users = await prisma.user.findMany({
    where: { id: { in: [...devices.keys()] }, waterReminders: true },
    select: { id: true, timeZone: true, waterGoal: true },
  });

  let sent = 0;
  for (const user of users) {
    const slot = dueWaterSlot(user.timeZone, now);
    if (!slot) continue;
    const today = zonedNow(user.timeZone, now).date;
    const { _sum } = await prisma.waterEntry.aggregate({ where: { userId: user.id, date: toDbDate(today) }, _sum: { amount: true } });
    const amount = _sum.amount ?? 0;
    if (amount >= user.waterGoal || !(await claim(user.id, slot, today))) continue;
    await deliver(devices, user.id, {
      title: 'Привычка',
      body: `Пора выпить воды 💧 Сегодня ${liters(amount)} из ${liters(user.waterGoal)} л`,
      tag: 'water', // a newer water reminder replaces the previous one
      url: '/water',
    });
    sent++;
  }
  return sent;
}

/** Share of scheduled habit-days done this week (Monday … `today`). */
export async function weekSummary(userId: string, today: string): Promise<{ scheduled: number; done: number }> {
  const monday = startOfWeek(today);
  const habits = await prisma.habit.findMany({ where: { userId }, select: { id: true, frequency: true, days: true, createdAt: true } });
  const completions = await prisma.completion.findMany({
    where: { userId, date: { gte: toDbDate(monday), lte: toDbDate(today) } },
    select: { habitId: true, date: true },
  });
  const doneSet = new Set(completions.map((c) => `${c.habitId}|${c.date.toISOString().slice(0, 10)}`));
  let scheduled = 0;
  let done = 0;
  for (let date = monday; date <= today; date = addDays(date, 1)) {
    for (const h of habits) {
      if (toDateStr(h.createdAt) > date || !isHabitScheduledOn({ frequency: h.frequency as Frequency, days: h.days }, date)) continue;
      scheduled++;
      if (doneSet.has(`${h.id}|${date}`)) done++;
    }
  }
  return { scheduled, done };
}

export function weeklySummaryText(pct: number, done: number, scheduled: number): string {
  const verdict = pct >= 80 ? 'Отличная неделя! 💪' : pct >= 50 ? 'Хороший результат — так держать!' : 'Новая неделя — новый шанс!';
  return `Выполнено ${pct}% привычек (${done} из ${scheduled}). ${verdict}`;
}

/** Sunday evening summary of the week. Returns how many were sent. */
export async function sendWeeklySummaries(now = new Date()): Promise<number> {
  if (!pushConfigured()) return 0;
  const devices = await devicesByUser(now);
  if (devices.size === 0) return 0;
  const users = await prisma.user.findMany({
    where: { id: { in: [...devices.keys()] }, weeklySummary: true },
    select: { id: true, timeZone: true },
  });

  let sent = 0;
  for (const user of users) {
    if (!isWeeklySummaryDue(user.timeZone, now)) continue;
    const today = zonedNow(user.timeZone, now).date;
    const { scheduled, done } = await weekSummary(user.id, today);
    if (scheduled === 0 || !(await claim(user.id, 'weekly', today))) continue;
    await deliver(devices, user.id, {
      title: 'Итоги недели',
      body: weeklySummaryText(Math.round((done / scheduled) * 100), done, scheduled),
      tag: 'weekly',
      url: '/stats',
    });
    sent++;
  }
  return sent;
}

const globalForScheduler = globalThis as unknown as { __habitflowReminders?: boolean };

/** Starts the once-a-minute check (a few seconds into each minute, so 08:00 goes out at 08:00:05). */
export function startReminderScheduler(): void {
  if (globalForScheduler.__habitflowReminders) return;
  globalForScheduler.__habitflowReminders = true;

  let running = false;
  const tick = async () => {
    if (running || !pushConfigured()) return;
    running = true;
    try {
      const now = new Date();
      const habits = await sendDueReminders(now);
      const water = await sendWaterReminders(now);
      const weekly = await sendWeeklySummaries(now);
      if (habits + water + weekly) console.info(`[push] sent: habits ${habits}, water ${water}, weekly ${weekly}`);
      // The logs only need the last few days.
      if (now.getMinutes() === 0) {
        const old = toDbDate(addDays(now.toISOString().slice(0, 10), -8));
        await prisma.sentReminder.deleteMany({ where: { date: { lt: old } } });
        await prisma.sentNotification.deleteMany({ where: { date: { lt: old } } });
      }
    } catch (err) {
      console.error('[push] reminder check failed:', err);
    } finally {
      running = false;
    }
  };

  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), 60_000);
  }, 60_000 - (Date.now() % 60_000) + 5_000);
  console.info(`[push] reminder scheduler started${pushConfigured() ? '' : ' (VAPID keys are not set — push is off)'}`);
}
