import { db } from '@/db';
import type { HabitRecord } from '@/db/schema';
import { addDays, isHabitScheduledOn, toDateStr } from '@/lib/shared/dates';
import type { HabitDTO, HabitInput } from '@/lib/shared/types';
import { ApiError } from '../http';

/** Calendar day the habit was created on (it can't be "missed" before that). */
export function habitStartDate(habit: HabitRecord): string {
  return toDateStr(new Date(habit.createdAt));
}

/**
 * Consecutive scheduled days completed, counting back from `today`.
 * Today only counts if it's already done — an unfinished today doesn't break the streak yet.
 */
export function computeStreak(habit: HabitRecord, doneDates: Set<string>, today: string): number {
  const start = habitStartDate(habit);
  let streak = 0;
  let day = today;
  for (let i = 0; i < 400 && day >= start; i++, day = addDays(day, -1)) {
    if (!isHabitScheduledOn(habit, day)) continue;
    if (doneDates.has(day)) streak++;
    else if (day === today) continue;
    else break;
  }
  return streak;
}

export function completionDatesByHabit(userId: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const c of db.completions.find((c) => c.userId === userId)) {
    if (!map.has(c.habitId)) map.set(c.habitId, new Set());
    map.get(c.habitId)!.add(c.date);
  }
  return map;
}

export function toHabitDTO(habit: HabitRecord, doneDates: Set<string>, date: string): HabitDTO {
  return {
    id: habit.id,
    title: habit.title,
    category: habit.category,
    frequency: habit.frequency,
    days: habit.days,
    reminderTime: habit.reminderTime,
    goal: habit.goal,
    createdAt: habit.createdAt,
    doneToday: doneDates.has(date),
    progressDone: doneDates.size,
    streak: computeStreak(habit, doneDates, date),
  };
}

export function listHabits(userId: string, date: string): HabitDTO[] {
  const dates = completionDatesByHabit(userId);
  return db.habits
    .find((h) => h.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((h) => toHabitDTO(h, dates.get(h.id) ?? new Set(), date));
}

export function getOwnedHabit(userId: string, habitId: string): HabitRecord {
  const habit = db.habits.findById(habitId);
  if (!habit || habit.userId !== userId) throw new ApiError(404, 'Привычка не найдена', 'not_found');
  return habit;
}

export function getHabit(userId: string, habitId: string, date: string): HabitDTO {
  const habit = getOwnedHabit(userId, habitId);
  return toHabitDTO(habit, completionDatesByHabit(userId).get(habit.id) ?? new Set(), date);
}

export function createHabit(userId: string, input: HabitInput, date: string): HabitDTO {
  const habit = db.habits.insert({ ...input, userId, createdAt: new Date().toISOString() });
  return toHabitDTO(habit, new Set(), date);
}

export function updateHabit(userId: string, habitId: string, patch: Partial<HabitInput>, date: string): HabitDTO {
  getOwnedHabit(userId, habitId);
  db.habits.update(habitId, patch);
  return getHabit(userId, habitId, date);
}

export function deleteHabit(userId: string, habitId: string): void {
  getOwnedHabit(userId, habitId);
  db.completions.removeWhere((c) => c.habitId === habitId);
  db.habits.remove(habitId);
}

/** Marks the habit done on `date`, or un-marks it if it was already done. */
export function toggleCompletion(userId: string, habitId: string, date: string): HabitDTO {
  getOwnedHabit(userId, habitId);
  const existing = db.completions.findOne((c) => c.habitId === habitId && c.date === date);
  if (existing) db.completions.remove(existing.id);
  else db.completions.insert({ userId, habitId, date, createdAt: new Date().toISOString() });
  return getHabit(userId, habitId, date);
}
