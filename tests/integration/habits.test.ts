import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/db';
import { ApiError } from '@/lib/server/http';
import { createHabit, deleteHabit, getHabit, habitHistory, listHabits, toggleCompletion, updateHabit } from '@/lib/server/services/habits';
import { getStats } from '@/lib/server/services/stats';
import { addWater, getWaterDay, removeWaterEntry, waterTotalsByDate } from '@/lib/server/services/water';
import type { HabitInput } from '@/lib/shared/types';
import { makeUser, resetDb } from '../helpers';

const TODAY = '2026-10-18'; // Sunday
const input = (over: Partial<HabitInput> = {}): HabitInput => ({
  title: 'Зарядка', category: 'Здоровье', frequency: 'Ежедневно', days: [], reminderTime: '', goal: null, ...over,
});

beforeEach(resetDb);

describe('habits', () => {
  it('create, list in creation order, edit, delete', async () => {
    const user = await makeUser();
    const a = await createHabit(user.id, input({ title: 'A' }), TODAY);
    await createHabit(user.id, input({ title: 'B', goal: { title: 'Цель', description: '', targetCount: 5, deadline: '2026-12-31' } }), TODAY);
    expect((await listHabits(user.id, TODAY)).map((h) => h.title)).toEqual(['A', 'B']);

    const edited = await updateHabit(user.id, a.id, { title: 'A2', goal: { title: 'G', description: '', targetCount: 3, deadline: '2026-12-01' } }, TODAY);
    expect(edited).toMatchObject({ title: 'A2', goal: { targetCount: 3 } });
    const cleared = await updateHabit(user.id, a.id, { goal: null }, TODAY);
    expect(cleared.goal).toBeNull();

    await deleteHabit(user.id, a.id);
    expect((await listHabits(user.id, TODAY)).map((h) => h.title)).toEqual(['B']);
  });

  it('toggle marks and un-marks the day; progress and streak follow', async () => {
    const user = await makeUser();
    const h = await createHabit(user.id, input(), '2026-10-01');
    await prisma.habit.update({ where: { id: h.id }, data: { createdAt: new Date('2026-10-01T08:00:00Z') } });
    await toggleCompletion(user.id, h.id, '2026-10-16');
    await toggleCompletion(user.id, h.id, '2026-10-17');
    const marked = await toggleCompletion(user.id, h.id, TODAY);
    expect(marked).toMatchObject({ doneToday: true, progressDone: 3, streak: 3 });
    const unmarked = await toggleCompletion(user.id, h.id, TODAY);
    expect(unmarked).toMatchObject({ doneToday: false, progressDone: 2, streak: 2 });
  });

  it('a double tap never creates two marks for one day', async () => {
    const user = await makeUser();
    const h = await createHabit(user.id, input(), TODAY);
    await Promise.all([toggleCompletion(user.id, h.id, TODAY), toggleCompletion(user.id, h.id, TODAY)]);
    expect(await prisma.completion.count({ where: { habitId: h.id } })).toBeLessThanOrEqual(1);
  });

  it('marking a past day (e.g. yesterday) works', async () => {
    const user = await makeUser();
    const h = await createHabit(user.id, input(), '2026-10-10');
    const yesterday = await toggleCompletion(user.id, h.id, '2026-10-17');
    expect(yesterday.doneToday).toBe(true);
    expect((await getHabit(user.id, h.id, TODAY)).doneToday).toBe(false);
  });

  it('someone else\'s or a malformed habit id is "not found"', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const h = await createHabit(owner.id, input(), TODAY);
    for (const call of [
      () => getHabit(stranger.id, h.id, TODAY),
      () => toggleCompletion(stranger.id, h.id, TODAY),
      () => getHabit(owner.id, 'not-a-uuid', TODAY),
    ]) {
      await expect(call()).rejects.toMatchObject({ status: 404 } satisfies Partial<ApiError>);
    }
  });

  it('history: done days from a date on, only for the owner', async () => {
    const user = await makeUser();
    const other = await makeUser();
    const h = await createHabit(user.id, input(), '2026-10-01');
    for (const d of ['2026-09-30', '2026-10-05', '2026-10-17']) await toggleCompletion(user.id, h.id, d);
    expect(await habitHistory(user.id, h.id, '2026-10-01')).toEqual(['2026-10-05', '2026-10-17']);
    await expect(habitHistory(other.id, h.id, '2026-10-01')).rejects.toMatchObject({ status: 404 });
  });

  it('deleting a habit removes its history', async () => {
    const user = await makeUser();
    const h = await createHabit(user.id, input(), TODAY);
    await toggleCompletion(user.id, h.id, TODAY);
    await deleteHabit(user.id, h.id);
    expect(await prisma.completion.count()).toBe(0);
  });
});

describe('water', () => {
  it('adds entries with a running total and removes one', async () => {
    const user = await makeUser();
    await addWater(user, TODAY, 250, '09:00');
    const day = await addWater(user, TODAY, 500, '11:00');
    expect(day.amount).toBe(750);
    expect(day.entries.map((e) => e.total)).toEqual([250, 750]);
    const after = await removeWaterEntry(user, day.entries[0].id);
    expect(after.amount).toBe(500);
    expect((await getWaterDay(user, '2026-10-17')).amount).toBe(0);
  });

  it('refuses silly amounts and other people\'s entries', async () => {
    const user = await makeUser();
    const other = await makeUser();
    await expect(addWater(user, TODAY, 0, '09:00')).rejects.toMatchObject({ code: 'invalid_amount' });
    const day = await addWater(user, TODAY, 250, '09:00');
    await expect(removeWaterEntry(other, day.entries[0].id)).rejects.toMatchObject({ status: 404 });
  });

  it('totals by day', async () => {
    const user = await makeUser();
    await addWater(user, '2026-10-17', 250, '09:00');
    await addWater(user, '2026-10-17', 250, '10:00');
    await addWater(user, TODAY, 1000, '09:00');
    expect(Object.fromEntries(await waterTotalsByDate(user.id))).toEqual({ '2026-10-17': 500, [TODAY]: 1000 });
  });
});

describe('statistics', () => {
  it('daily completion %, best streak, water week', async () => {
    const user = await makeUser({ firstUseDate: '2026-10-01' });
    const a = await createHabit(user.id, input({ title: 'A' }), '2026-10-01');
    const b = await createHabit(user.id, input({ title: 'B' }), '2026-10-01');
    await prisma.habit.updateMany({ data: { createdAt: new Date('2026-10-01T08:00:00Z') } });
    for (const d of ['2026-10-12', '2026-10-13', '2026-10-14']) await toggleCompletion(user.id, a.id, d);
    await toggleCompletion(user.id, b.id, '2026-10-12');
    await addWater(user, '2026-10-12', 2000, '12:00');

    const stats = await getStats(user, '2026-10-14');
    const byDate = Object.fromEntries(stats.habitsWeek.map((p) => [p.date, p.value]));
    expect(byDate['2026-10-12']).toBe(100); // both done
    expect(byDate['2026-10-13']).toBe(50); // one of two
    expect(stats.bestStreak).toEqual({ days: 3, habitTitle: 'A' });
    expect(stats.waterWeek.find((p) => p.date === '2026-10-12')?.value).toBe(2000);
    expect(stats.habitsWeek).toHaveLength(7);
  });
});
