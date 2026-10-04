import { requireUser, toUserDTO } from '@/lib/server/auth';
import { handle, json } from '@/lib/server/http';

// GET /api/auth/me -> UserDTO | 401
export const GET = handle(async () => json(toUserDTO(await requireUser())));
