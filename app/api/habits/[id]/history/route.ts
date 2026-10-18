import { requireUser } from '@/lib/server/auth';
import { handle, json, requestDate } from '@/lib/server/http';
import { habitHistory } from '@/lib/server/services/habits';
import { addDays, isValidDateStr } from '@/lib/shared/dates';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/habits/:id/history?from=YYYY-MM-DD&date=YYYY-MM-DD -> { dates: string[] } — days the habit was done
// (from `from`, default: 16 weeks before `date`)
export const GET = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const from = new URL(req.url).searchParams.get('from');
  const start = isValidDateStr(from) ? from : addDays(requestDate(req), -16 * 7);
  return json({ dates: await habitHistory(user.id, id, start) });
});
