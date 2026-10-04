import { requireUser } from '@/lib/server/auth';
import { handle, json } from '@/lib/server/http';
import { removeWaterEntry } from '@/lib/server/services/water';

type Ctx = { params: Promise<{ entryId: string }> };

// DELETE /api/water/:entryId -> WaterDayDTO (for that entry's day)
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { entryId } = await params;
  return json(await removeWaterEntry(user, entryId));
});
