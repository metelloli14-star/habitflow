import { db } from '@/db';
import type { UserRecord } from '@/db/schema';
import type { WaterDayDTO } from '@/lib/shared/types';
import { ApiError } from '../http';

export function waterTotalsByDate(userId: string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of db.waterEntries.find((e) => e.userId === userId)) {
    totals.set(e.date, (totals.get(e.date) ?? 0) + e.amount);
  }
  return totals;
}

export function getWaterDay(user: UserRecord, date: string): WaterDayDTO {
  const rows = db.waterEntries
    .find((e) => e.userId === user.id && e.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let running = 0;
  const entries = rows.map((e) => {
    running += e.amount;
    return { id: e.id, amount: e.amount, time: e.time, total: running };
  });
  return { date, goal: user.waterGoal, amount: running, entries };
}

export function addWater(user: UserRecord, date: string, amount: unknown, time: unknown): WaterDayDTO {
  const ml = Number(amount);
  if (!Number.isInteger(ml) || ml < 1 || ml > 5000) throw new ApiError(400, 'Некорректный объём воды', 'invalid_amount');
  const hhmm = typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '';
  db.waterEntries.insert({ userId: user.id, date, amount: ml, time: hhmm, createdAt: new Date().toISOString() });
  return getWaterDay(user, date);
}

export function removeWaterEntry(user: UserRecord, entryId: string): WaterDayDTO {
  const entry = db.waterEntries.findById(entryId);
  if (!entry || entry.userId !== user.id) throw new ApiError(404, 'Запись не найдена', 'not_found');
  db.waterEntries.remove(entryId);
  return getWaterDay(user, entry.date);
}
