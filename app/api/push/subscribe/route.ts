import { requireSession } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { removePushSubscription, savePushSubscription } from '@/lib/server/services/push';

// POST /api/push/subscribe  { subscription: PushSubscriptionJSON, timeZone } -> { ok } — this device gets reminders
export const POST = handle(async (req: Request) => {
  const { sessionId, user } = await requireSession();
  const body = await readJson<Record<string, unknown>>(req);
  await savePushSubscription(sessionId, user.id, body.subscription, body.timeZone);
  return json({ ok: true });
});

// DELETE /api/push/subscribe -> { ok } — this device stops getting reminders
export const DELETE = handle(async () => {
  const { sessionId } = await requireSession();
  await removePushSubscription(sessionId);
  return json({ ok: true });
});
