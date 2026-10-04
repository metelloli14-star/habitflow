import { requireUser } from '@/lib/server/auth';
import { handle, json, readJson, requestDate } from '@/lib/server/http';
import { createHabit, listHabits } from '@/lib/server/services/habits';
import { validateHabitInput } from '@/lib/server/validation';

// GET /api/habits?date=YYYY-MM-DD -> HabitDTO[]
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  return json(listHabits(user.id, requestDate(req)));
});

// POST /api/habits?date=YYYY-MM-DD  HabitInput -> HabitDTO
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const input = validateHabitInput(await readJson(req), false);
  return json(createHabit(user.id, input, requestDate(req)), 201);
});
