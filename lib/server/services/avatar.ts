// Profile photos: stored in the "avatars" table and served by URL (/api/profile/avatar?v=<version>),
// so the photo isn't sent with every request for the user — the browser downloads it once and keeps it.

import { randomBytes } from 'node:crypto';
import { prisma } from '@/db';
import { ApiError } from '../http';

/** The first bytes of each allowed format — the content must really be that image, whatever the data URL claims. */
const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => Buffer.from(b.subarray(0, 4)).toString('latin1') === 'RIFF' && Buffer.from(b.subarray(8, 12)).toString('latin1') === 'WEBP',
};

/** 'data:image/jpeg;base64,…' (format already checked by validateAvatar) → MIME type and bytes. */
export function decodeAvatar(dataUrl: string): { mimeType: string; data: Uint8Array<ArrayBuffer> } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  const data = match ? new Uint8Array(Buffer.from(match[2], 'base64')) : null;
  if (!match || !data || !SIGNATURES[match[1]](data)) throw new ApiError(400, 'Некорректное изображение', 'invalid_avatar');
  return { mimeType: match[1], data };
}

/** Saves the photo (or removes it, with null). Returns the new version to keep on the user (null — no photo). */
export async function saveAvatar(userId: string, dataUrl: string | null): Promise<string | null> {
  if (dataUrl === null) {
    await prisma.avatar.deleteMany({ where: { userId } });
    return null;
  }
  const { mimeType, data } = decodeAvatar(dataUrl);
  await prisma.avatar.upsert({ where: { userId }, create: { userId, mimeType, data }, update: { mimeType, data } });
  return randomBytes(6).toString('base64url');
}

export function getAvatar(userId: string) {
  return prisma.avatar.findUnique({ where: { userId }, select: { mimeType: true, data: true } });
}

/** Address of the photo for the UI; null when there's none. */
export const avatarUrl = (version: string | null | undefined): string | null =>
  version ? `/api/profile/avatar?v=${version}` : null;
