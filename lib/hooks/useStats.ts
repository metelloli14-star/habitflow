'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/client/api';
import type { StatsDTO } from '@/lib/shared/types';
import { keys } from './keys';
import { useToday } from './useToday';

export function useStats() {
  const today = useToday();
  const { data, error, isLoading } = useSWR<StatsDTO>(today ? keys.stats(today) : null, fetcher);
  return { stats: data ?? null, isLoading: !today || isLoading, error };
}
