import { updateUser } from '@/db';
import { requireUser, toUserDTO } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { validateWaterGoal } from '@/lib/server/validation';

// PATCH /api/water/goal  { goal: 1500 | 2000 | 2500 | 3000 } -> UserDTO
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await readJson<Record<string, unknown>>(req);
  return json(toUserDTO(await updateUser(user.id, { waterGoal: validateWaterGoal(body.goal) })));
});
