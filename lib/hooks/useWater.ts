'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { api, fetcher } from '@/lib/client/api';
import { currentTimeHHMM } from '@/lib/shared/dates';
import type { UserDTO, WaterDayDTO } from '@/lib/shared/types';
import { keys, refreshWaterData } from './keys';
import { useToday } from './useToday';

/** Today's water: amount, goal, entries. Also exposes add / remove entry / change goal. */
export function useWater() {
  const today = useToday();
  const { data, error, isLoading, mutate } = useSWR<WaterDayDTO>(today ? keys.water(today) : null, fetcher);

  const addWater = async (amount: number) => {
    if (!today) return;
    if (data) {
      // Show the new amount immediately; the server response replaces it a moment later.
      const total = data.amount + amount;
      const entry = { id: `pending-${Date.now()}`, amount, time: currentTimeHHMM(), total };
      mutate({ ...data, amount: total, entries: [...data.entries, entry] }, false);
    }
    const day = await api.post<WaterDayDTO>(keys.water(today), { amount, time: currentTimeHHMM() });
    await mutate(day, false);
    await refreshWaterData();
  };

  const removeEntry = async (entryId: string) => {
    const day = await api.del<WaterDayDTO>(`/api/water/${entryId}`);
    await mutate(day, false);
    await refreshWaterData();
  };

  const setGoal = async (goal: number) => {
    const user = await api.patch<UserDTO>('/api/water/goal', { goal });
    await globalMutate(keys.me, user, { revalidate: false });
    await refreshWaterData();
  };

  return { day: data ?? null, isLoading: !today || isLoading, error, addWater, removeEntry, setGoal };
}
