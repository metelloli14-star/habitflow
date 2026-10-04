import { requireUser } from '@/lib/server/auth';
import { handle, json, readJson, requestDate } from '@/lib/server/http';
import { deleteHabit, getHabit, updateHabit } from '@/lib/server/services/habits';
import { validateHabitInput } from '@/lib/server/validation';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/habits/:id?date=YYYY-MM-DD -> HabitDTO
export const GET = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return json(getHabit(user.id, id, requestDate(req)));
});

// PATCH /api/habits/:id?date=YYYY-MM-DD  Partial<HabitInput> -> HabitDTO
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const patch = validateHabitInput(await readJson(req), true);
  return json(updateHabit(user.id, id, patch, requestDate(req)));
});

// DELETE /api/habits/:id — also removes its completion history
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  deleteHabit(user.id, id);
  return json({ ok: true });
});
