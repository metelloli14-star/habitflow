'use client';

import useSWR, { mutate } from 'swr';
import { api, ApiClientError, fetcher } from '@/lib/client/api';
import { trackGoal } from '@/lib/client/analytics';
import { forgetPushOnThisDevice } from '@/lib/client/push';
import { todayStr } from '@/lib/shared/dates';
import type { UserDTO } from '@/lib/shared/types';
import { clearAllData, keys } from './keys';

/** The logged-in person, or null. `isUnauthorized` is true when there's no valid session. */
export function useSession() {
  const { data, error, isLoading } = useSWR<UserDTO>(keys.me, fetcher, { shouldRetryOnError: false });
  return {
    user: data ?? null,
    isLoading,
    isUnauthorized: error instanceof ApiClientError && error.status === 401,
    error: error as ApiClientError | undefined,
  };
}

export interface RegisterResult {
  email: string;
  /** Only returned by the mock backend in development. */
  devCode?: string;
}

const withDate = (url: string) => `${url}?date=${todayStr()}`;

export const authApi = {
  async register(name: string, email: string, password: string) {
    const result = await api.post<RegisterResult>(withDate('/api/auth/register'), { name, email, password });
    trackGoal('register');
    return result;
  },
  async verify(email: string, code: string) {
    const user = await api.post<UserDTO>(withDate('/api/auth/verify'), { email, code });
    trackGoal('email_confirmed');
    await mutate(keys.me, user, { revalidate: false });
    return user;
  },
  async resend(email: string) {
    return api.post<RegisterResult>('/api/auth/resend', { email });
  },
  async login(email: string, password: string) {
    const user = await api.post<UserDTO>('/api/auth/login', { email, password });
    trackGoal('login');
    await mutate(keys.me, user, { revalidate: false });
    return user;
  },
  /** Sends a reset code if the account exists (the answer is the same either way). */
  async forgotPassword(email: string) {
    return api.post<{ ok: true; devCode?: string }>('/api/auth/password/forgot', { email });
  },
  /** Sets the new password with the code and signs in. */
  async resetPassword(email: string, code: string, password: string) {
    const user = await api.post<UserDTO>('/api/auth/password/reset', { email, code, password });
    await mutate(keys.me, user, { revalidate: false });
    return user;
  },
  async logout() {
    await api.post('/api/auth/logout');
    await forgetPushOnThisDevice();
    await clearAllData();
  },
};
