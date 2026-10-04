import { requireUser } from '@/lib/server/auth';
import { handle, json, requestDate } from '@/lib/server/http';
import { getStats } from '@/lib/server/services/stats';

// GET /api/stats?date=YYYY-MM-DD -> StatsDTO
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  return json(getStats(user, requestDate(req)));
});
