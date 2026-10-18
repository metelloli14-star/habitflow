import { requireUser } from '@/lib/server/auth';
import { ApiError, handle } from '@/lib/server/http';
import { getAvatar } from '@/lib/server/services/avatar';

// GET /api/profile/avatar?v=<version> -> the person's own profile photo.
// The version in the address changes with every new photo, so the browser may keep each one for good.
export const GET = handle(async () => {
  const user = await requireUser();
  const avatar = await getAvatar(user.id);
  if (!avatar) throw new ApiError(404, 'Фото не найдено', 'not_found');
  return new Response(avatar.data, {
    headers: {
      'Content-Type': avatar.mimeType,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
