import { badgeIcon } from '@/lib/server/brandIcon';

// /badge.png — small status-bar icon of push notifications on Android (used by public/sw.js).
export const dynamic = 'force-static';

export function GET() {
  return badgeIcon(96);
}
