import { updateUser, type UserPatch } from '@/db';
import { requireUser, toUserDTO } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { limitEmailSends } from '@/lib/server/rateLimit';
import { saveAvatar } from '@/lib/server/services/avatar';
import { devCode, requestEmailChange } from '@/lib/server/services/users';
import { validateAvatar, validateEmail, validateGender, validateName } from '@/lib/server/validation';

// GET /api/profile -> UserDTO
export const GET = handle(async () => json(toUserDTO(await requireUser())));

// PATCH /api/profile  { name?, email?, gender?, avatar? (data URL to upload | null to remove) } -> UserDTO & { devCode? }
// The photo is stored separately and comes back as a URL in `avatar`.
// Also { waterReminders?, weeklySummary? } — which push notifications besides habit reminders the person wants.
// A new email isn't applied right away: a code is sent to it and `pendingEmail` is set
// until it's confirmed via POST /api/profile/email.
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await readJson<Record<string, unknown>>(req);
  const patch: UserPatch = {};
  if ('name' in body) patch.name = validateName(body.name);
  if ('gender' in body) patch.gender = validateGender(body.gender);
  const avatar = 'avatar' in body ? validateAvatar(body.avatar) : undefined;
  if (typeof body.waterReminders === 'boolean') patch.waterReminders = body.waterReminders;
  if (typeof body.weeklySummary === 'boolean') patch.weeklySummary = body.weeklySummary;
  const newEmail = 'email' in body ? validateEmail(body.email) : null;

  // Check the email first so a taken address doesn't leave the other fields half-saved.
  if (newEmail !== null && newEmail !== user.email && newEmail !== user.pendingEmail) limitEmailSends(req);
  const code = newEmail !== null ? await requestEmailChange(user, newEmail) : null;
  if (avatar !== undefined) patch.avatarVersion = await saveAvatar(user.id, avatar);
  const updated = await updateUser(user.id, patch);
  return json({ ...toUserDTO(updated), ...devCode(code) });
});
