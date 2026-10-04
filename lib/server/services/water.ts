import { fromDbDate, isUuid, prisma, toDbDate } from '@/db';
import type { UserRecord } from '@/db/schema';
import type { WaterDayDTO } from '@/lib/shared/types';
import { ApiError } from '../http';

export async function waterTotalsByDate(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.waterEntry.groupBy({ by: ['date'], where: { userId }, _sum: { amount: true } });
  return new Map(rows.map((r) => [fromDbDate(r.date), r._sum.amount ?? 0]));
}

export async function getWaterDay(user: UserRecord, date: string): Promise<WaterDayDTO> {
  const rows = await prisma.waterEntry.findMany({
    where: { userId: user.id, date: toDbDate(date) },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  let running = 0;
  const entries = rows.map((e) => {
    running += e.amount;
    return { id: e.id, amount: e.amount, time: e.time, total: running };
  });
  return { date, goal: user.waterGoal, amount: running, entries };
}

export async function addWater(user: UserRecord, date: string, amount: unknown, time: unknown): Promise<WaterDayDTO> {
  const ml = Number(amount);
  if (!Number.isInteger(ml) || ml < 1 || ml > 5000) throw new ApiError(400, 'Некорректный объём воды', 'invalid_amount');
  const hhmm = typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '';
  await prisma.waterEntry.create({ data: { userId: user.id, date: toDbDate(date), amount: ml, time: hhmm } });
  return getWaterDay(user, date);
}

export async function removeWaterEntry(user: UserRecord, entryId: string): Promise<WaterDayDTO> {
  const entry = isUuid(entryId) ? await prisma.waterEntry.findFirst({ where: { id: entryId, userId: user.id } }) : null;
  if (!entry) throw new ApiError(404, 'Запись не найдена', 'not_found');
  await prisma.waterEntry.deleteMany({ where: { id: entryId } });
  return getWaterDay(user, fromDbDate(entry.date));
}
