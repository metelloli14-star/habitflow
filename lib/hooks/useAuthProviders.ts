'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/client/api';

type VkMode = 'live' | 'mock' | 'off';

/** Which external login methods are available. `vk` is null while loading. */
export function useAuthProviders(): { vk: VkMode | null } {
  const { data } = useSWR<{ vk: VkMode }>('/api/auth/providers', fetcher, { revalidateOnFocus: false });
  return { vk: data?.vk ?? null };
}
