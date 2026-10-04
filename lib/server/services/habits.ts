import { fromDbDate, isUuid, Prisma, prisma, toDbDate, toHabitRecord } from '@/db';
import type { HabitRecord } from '@/db/schema';
import { addDays, isHabitScheduledOn, toDateStr } from '@/lib/shared/dates';
import type { HabitDTO, HabitGoal, HabitInput } from '@/lib/shared/types';
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

export async function completionDatesByHabit(userId: string): Promise<Map<string, Set<string>>> {
  const rows = await prisma.completion.findMany({ where: { userId }, select: { habitId: true, date: true } });
  const map = new Map<string, Set<string>>();
  for (const c of rows) {
    if (!map.has(c.habitId)) map.set(c.habitId, new Set());
    map.get(c.habitId)!.add(fromDbDate(c.date));
  }
  return map;
}

async function completionDates(habitId: string): Promise<Set<string>> {
  const rows = await prisma.completion.findMany({ where: { habitId }, select: { date: true } });
  return new Set(rows.map((c) => fromDbDate(c.date)));
}

/** All of the person's habits, oldest first. */
export async function findHabits(userId: string): Promise<HabitRecord[]> {
  const rows = await prisma.habit.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  return rows.map(toHabitRecord);
}

/** A removed goal is stored as SQL NULL. */
const goalData = (goal: HabitGoal | null) => (goal === null ? Prisma.DbNull : { ...goal });

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

export async function listHabits(userId: string, date: string): Promise<HabitDTO[]> {
  const [habits, dates] = await Promise.all([findHabits(userId), completionDatesByHabit(userId)]);
  return habits.map((h) => toHabitDTO(h, dates.get(h.id) ?? new Set(), date));
}

export async function getOwnedHabit(userId: string, habitId: string): Promise<HabitRecord> {
  const row = isUuid(habitId) ? await prisma.habit.findFirst({ where: { id: habitId, userId } }) : null;
  if (!row) throw new ApiError(404, 'Привычка не найдена', 'not_found');
  return toHabitRecord(row);
}

export async function getHabit(userId: string, habitId: string, date: string): Promise<HabitDTO> {
  const habit = await getOwnedHabit(userId, habitId);
  return toHabitDTO(habit, await completionDates(habit.id), date);
}

export async function createHabit(userId: string, input: HabitInput, date: string): Promise<HabitDTO> {
  const row = await prisma.habit.create({ data: { ...input, goal: goalData(input.goal), userId } });
  return toHabitDTO(toHabitRecord(row), new Set(), date);
}

export async function updateHabit(userId: string, habitId: string, patch: Partial<HabitInput>, date: string): Promise<HabitDTO> {
  await getOwnedHabit(userId, habitId);
  const { goal, ...rest } = patch;
  const row = await prisma.habit.update({
    where: { id: habitId },
    data: goal === undefined ? rest : { ...rest, goal: goalData(goal) },
  });
  return toHabitDTO(toHabitRecord(row), await completionDates(habitId), date);
}

/** Deletes the habit; its completion history goes with it (ON DELETE CASCADE). */
export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  await getOwnedHabit(userId, habitId);
  await prisma.habit.deleteMany({ where: { id: habitId } });
}

/** Marks the habit done on `date`, or un-marks it if it was already done. */
export async function toggleCompletion(userId: string, habitId: string, date: string): Promise<HabitDTO> {
  await getOwnedHabit(userId, habitId);
  const day = toDbDate(date);
  const removed = await prisma.completion.deleteMany({ where: { habitId, date: day } });
  // skipDuplicates: a double tap can't create two marks for the same day.
  if (removed.count === 0) await prisma.completion.createMany({ data: [{ userId, habitId, date: day }], skipDuplicates: true });
  return getHabit(userId, habitId, date);
}
