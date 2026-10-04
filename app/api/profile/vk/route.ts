import { requireUser, toUserDTO } from '@/lib/server/auth';
import { handle, json } from '@/lib/server/http';
import { unlinkVk } from '@/lib/server/services/users';

// DELETE /api/profile/vk -> UserDTO — unlinks VK ID (only if the account can still log in with email + password)
export const DELETE = handle(async () => json(toUserDTO(await unlinkVk(await requireUser()))));
