import { requireUser } from '@/lib/server/auth';
import { handle, json, readJson, requestDate } from '@/lib/server/http';
import { addWater, getWaterDay } from '@/lib/server/services/water';

// GET /api/water?date=YYYY-MM-DD -> WaterDayDTO
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  return json(getWaterDay(user, requestDate(req)));
});

// POST /api/water?date=YYYY-MM-DD  { amount, time } -> WaterDayDTO
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await readJson<Record<string, unknown>>(req);
  return json(addWater(user, requestDate(req), body.amount, body.time), 201);
});
