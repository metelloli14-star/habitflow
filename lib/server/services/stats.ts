import type { UserRecord } from '@/db/schema';
import { addDays, isHabitScheduledOn, startOfMonth, startOfWeek, weekdayLabel } from '@/lib/shared/dates';
import type { StatsDTO } from '@/lib/shared/types';
import { completionDatesByHabit, computeStreak, findHabits, habitStartDate } from './habits';
import { waterTotalsByDate } from './water';

export async function getStats(user: UserRecord, today: string): Promise<StatsDTO> {
  const [habits, doneByHabit, water] = await Promise.all([
    findHabits(user.id),
    completionDatesByHabit(user.id),
    waterTotalsByDate(user.id),
  ]);

  /** % of the habits scheduled on that day that were done, or null if nothing was scheduled. */
  const dayCompletion = (date: string): number | null => {
    const scheduled = habits.filter((h) => habitStartDate(h) <= date && isHabitScheduledOn(h, date));
    if (scheduled.length === 0) return null;
    const done = scheduled.filter((h) => doneByHabit.get(h.id)?.has(date)).length;
    return Math.round((done / scheduled.length) * 100);
  };

  const weekStart = startOfWeek(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // A day with habits scheduled but nothing marked counts as 0%, not as "no data".
  const habitsWeek = weekDates.map((date) => ({
    date,
    label: weekdayLabel(date),
    value: date <= today ? dayCompletion(date) ?? 0 : 0,
  }));

  // Month average: from the 1st of the month, or from the first day of use if that's later.
  let monthStart = startOfMonth(today);
  if (user.firstUseDate > monthStart) monthStart = user.firstUseDate;
  const monthValues: number[] = [];
  for (let d = monthStart; d <= today; d = addDays(d, 1)) {
    const v = dayCompletion(d);
    if (v !== null) monthValues.push(v);
  }
  const monthAverage = monthValues.length
    ? Math.round(monthValues.reduce((s, v) => s + v, 0) / monthValues.length)
    : null;

  let bestStreak: StatsDTO['bestStreak'] = null;
  for (const h of habits) {
    const days = computeStreak(h, doneByHabit.get(h.id) ?? new Set(), today);
    if (days > 0 && (!bestStreak || days > bestStreak.days)) bestStreak = { days, habitTitle: h.title };
  }

  // Water: a day without entries is 0 ml. The weekly average covers the days of this week so far.
  const waterWeek = weekDates.map((date) => ({ date, label: weekdayLabel(date), value: water.get(date) ?? 0 }));
  const elapsed = waterWeek.filter((d) => d.date <= today);
  const waterAverage = Math.round(elapsed.reduce((s, d) => s + d.value, 0) / Math.max(1, elapsed.length));

  const prevTotal = weekDates.reduce((s, date) => s + (water.get(addDays(date, -7)) ?? 0), 0);
  const prevAverage = prevTotal / 7;
  const waterChangePct = prevAverage > 0 ? Math.round(((waterAverage - prevAverage) / prevAverage) * 100) : null;

  return { bestStreak, monthAverage, habitsWeek, waterWeek, waterAverage, waterChangePct };
}
