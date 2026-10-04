import { requireUser } from '@/lib/server/auth';
import { handle, json, requestDate } from '@/lib/server/http';
import { toggleCompletion } from '@/lib/server/services/habits';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/habits/:id/toggle?date=YYYY-MM-DD -> HabitDTO (marks done / un-marks for that day)
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return json(toggleCompletion(user.id, id, requestDate(req)));
});
