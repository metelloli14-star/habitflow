'use client';

import { mutate } from 'swr';
import { api } from '@/lib/client/api';
import type { Gender, UserDTO } from '@/lib/shared/types';
import { clearAllData, keys } from './keys';

export interface ProfileUpdate {
  name?: string;
  email?: string;
  gender?: Gender;
  /** data URL to set a photo, null to remove it, omit to keep the current one */
  avatar?: string | null;
}

/** The profile response; `devCode` only comes from the mock backend in development. */
type ProfileResponse = UserDTO & { devCode?: string };

const storeUser = async ({ devCode, ...user }: ProfileResponse) => {
  await mutate(keys.me, user, { revalidate: false });
  return { user: user as UserDTO, devCode };
};

export const profileApi = {
  /** Saves the profile. A changed email isn't applied yet: see `user.pendingEmail` and `confirmEmail`. */
  async update(patch: ProfileUpdate) {
    return storeUser(await api.patch<ProfileResponse>('/api/profile', patch));
  },
  /** Confirms the new email with the code sent to it. */
  async confirmEmail(code: string) {
    return storeUser(await api.post<ProfileResponse>('/api/profile/email', { code }));
  },
  async resendEmailCode() {
    return api.post<{ ok: true; devCode?: string }>('/api/profile/email/resend');
  },
  /** Unlinks VK ID (the server refuses if the account would be left without a way to log in). */
  async unlinkVk() {
    return storeUser(await api.del<ProfileResponse>('/api/profile/vk'));
  },
  /** Keeps the current email and drops the pending one. */
  async cancelEmailChange() {
    return storeUser(await api.del<ProfileResponse>('/api/profile/email'));
  },
  async deleteAccount() {
    await api.del('/api/account');
    await clearAllData();
  },
};
