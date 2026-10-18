'use client';

import useSWR from 'swr';
import { api, fetcher } from '@/lib/client/api';
import { trackGoal } from '@/lib/client/analytics';
import { haptic } from '@/lib/client/haptics';
import type { HabitDTO, HabitInput } from '@/lib/shared/types';
import { keys, refreshHabitData } from './keys';
import { useToday } from './useToday';

/**
 * All habits with their status on `day` — today by default, or e.g. yesterday to mark what was forgotten.
 * Also exposes create / toggle.
 */
export function useHabits(day?: string) {
  const today = useToday();
  const date = day ?? today;
  const { data, error, isLoading, mutate } = useSWR<HabitDTO[]>(date ? keys.habits(date) : null, fetcher);

  const createHabit = async (input: HabitInput) => {
    const habit = await api.post<HabitDTO>(keys.habits(today!), input);
    trackGoal('habit_created');
    await refreshHabitData();
    return habit;
  };

  /** Marks a habit done/undone on that day. Updates the UI instantly, then syncs with the server. */
  const toggleHabit = async (id: string) => {
    if (!date || !data) return;
    if (data.find((h) => h.id === id)?.doneToday === false) {
      haptic();
      trackGoal('habit_marked', { day: date === today ? 'today' : 'past' });
    }
    const optimistic = data.map((h) =>
      h.id === id
        ? { ...h, doneToday: !h.doneToday, progressDone: h.progressDone + (h.doneToday ? -1 : 1) }
        : h,
    );
    await mutate(
      async () => {
        await api.post<HabitDTO>(`/api/habits/${id}/toggle?date=${date}`);
        return undefined;
      },
      { optimisticData: optimistic, rollbackOnError: true, populateCache: false, revalidate: false },
    );
    await refreshHabitData();
  };

  return {
    habits: data ?? [],
    isLoading: !date || isLoading,
    error,
    today,
    /** The day the statuses are for. */
    day: date,
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

/** Days the habit was done since `from` (YYYY-MM-DD) — for the history calendar. */
export function useHabitHistory(id: string, from: string | null) {
  const { data, isLoading } = useSWR<{ dates: string[] }>(from ? `/api/habits/${id}/history?from=${from}` : null, fetcher);
  return { dates: data?.dates ?? null, isLoading };
}
