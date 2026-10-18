import { beforeEach, describe, expect, it } from 'vitest';
import { findUserById, prisma, updateUser } from '@/db';
import { toUserDTO } from '@/lib/server/auth';
import { deleteAccountData } from '@/lib/server/services/account';
import { getAvatar, saveAvatar } from '@/lib/server/services/avatar';
import { TINY_JPEG, TINY_PNG } from '../fixtures';
import { makeUser, resetDb } from '../helpers';

beforeEach(resetDb);

describe('profile photo', () => {
  it('is stored separately and the user only carries its URL', async () => {
    const user = await makeUser();
    const version = await saveAvatar(user.id, TINY_PNG);
    const updated = await updateUser(user.id, { avatarVersion: version });
    expect(toUserDTO(updated).avatar).toBe(`/api/profile/avatar?v=${version}`);
    const photo = (await getAvatar(user.id))!;
    expect(photo.mimeType).toBe('image/png');
    expect([...photo.data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('a new photo gets a new address (browsers cache each one for good)', async () => {
    const user = await makeUser();
    const v1 = await saveAvatar(user.id, TINY_PNG);
    const v2 = await saveAvatar(user.id, TINY_JPEG);
    expect(v2).not.toBe(v1);
    expect((await getAvatar(user.id))?.mimeType).toBe('image/jpeg');
    expect(await prisma.avatar.count()).toBe(1);
  });

  it('removing the photo and deleting the account clean up', async () => {
    const user = await makeUser();
    await saveAvatar(user.id, TINY_PNG);
    expect(await saveAvatar(user.id, null)).toBeNull();
    expect(await getAvatar(user.id)).toBeNull();
    await saveAvatar(user.id, TINY_PNG);
    await deleteAccountData(user.id);
    expect(await prisma.avatar.count()).toBe(0);
  });

  it('a user without a photo has avatar = null', async () => {
    const user = await makeUser();
    expect(toUserDTO((await findUserById(user.id))!).avatar).toBeNull();
  });
});
