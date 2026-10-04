'use client';

import useSWR from 'swr';
import { api, fetcher } from '@/lib/client/api';
import type { HabitDTO, HabitInput } from '@/lib/shared/types';
import { keys, refreshHabitData } from './keys';
import { useToday } from './useToday';

/** All habits with today's status. Also exposes create / update / delete / toggle. */
export function useHabits() {
  const today = useToday();
  const { data, error, isLoading, mutate } = useSWR<HabitDTO[]>(today ? keys.habits(today) : null, fetcher);

  const createHabit = async (input: HabitInput) => {
    const habit = await api.post<HabitDTO>(keys.habits(today!), input);
    await refreshHabitData();
    return habit;
  };

  /** Marks a habit done/undone for today. Updates the UI instantly, then syncs with the server. */
  const toggleHabit = async (id: string) => {
    if (!today || !data) return;
    const optimistic = data.map((h) =>
      h.id === id
        ? { ...h, doneToday: !h.doneToday, progressDone: h.progressDone + (h.doneToday ? -1 : 1) }
        : h,
    );
    await mutate(
      async () => {
        await api.post<HabitDTO>(`/api/habits/${id}/toggle?date=${today}`);
        return undefined;
      },
      { optimisticData: optimistic, rollbackOnError: true, populateCache: false, revalidate: false },
    );
    await refreshHabitData();
  };

  return {
    habits: data ?? [],
    isLoading: !today || isLoading,
    error,
    today,
    createHabit,
    toggleHabit,
  };
}

/** One habit (for the edit screen). */
export function useHabit(id: string) {
  const today = useToday();
  const { data, error, isLoading } = useSWR<HabitDTO>(today ? keys.habit(id, today) : null, fetcher, {
    shouldRetryOnError: false,
  });

  const updateHabit = async (patch: Partial<HabitInput>) => {
    const habit = await api.patch<HabitDTO>(keys.habit(id, today!), patch);
    await refreshHabitData();
    return habit;
  };

  const deleteHabit = async () => {
    await api.del(`/api/habits/${id}`);
    await refreshHabitData();
  };

  return { habit: data ?? null, isLoading: !today || isLoading, error, updateHabit, deleteHabit };
}
