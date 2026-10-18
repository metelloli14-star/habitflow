import { handle, json } from '@/lib/server/http';
import { pushPublicKey } from '@/lib/server/push';

// GET /api/push/key -> { publicKey: string | null } — the VAPID public key browsers subscribe with (null: push is off)
export const GET = handle(async () => json({ publicKey: pushPublicKey() }));
