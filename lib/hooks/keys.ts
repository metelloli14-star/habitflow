import { mutate } from 'swr';

// SWR cache keys in one place, so every hook and mutation refers to the same data.
export const keys = {
  me: '/api/auth/me',
  habits: (date: string) => `/api/habits?date=${date}`,
  habit: (id: string, date: string) => `/api/habits/${id}?date=${date}`,
  water: (date: string) => `/api/water?date=${date}`,
  stats: (date: string) => `/api/stats?date=${date}`,
};

const startsWithAny = (prefixes: string[]) => (key: unknown) =>
  typeof key === 'string' && prefixes.some((p) => key.startsWith(p));

/** Re-fetch everything derived from habits (lists, single habits, statistics). */
export const refreshHabitData = () => mutate(startsWithAny(['/api/habits', '/api/stats']));
/** Re-fetch water data and the statistics that include it. */
export const refreshWaterData = () => mutate(startsWithAny(['/api/water', '/api/stats']));
/** Drop every cached response (used on logout / account deletion). */
export const clearAllData = () => mutate(() => true, undefined, { revalidate: false });
