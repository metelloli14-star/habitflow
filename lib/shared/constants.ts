import type { Category, Frequency } from './types';

export const SESSION_COOKIE = 'hf_session';

export const CATEGORIES: Category[] = ['Здоровье', 'Хобби', 'Разум'];

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'Ежедневно', label: 'Каждый день' },
  { value: 'Еженедельно', label: 'По неделям' },
  { value: 'Ежемесячно', label: 'По месяцам' },
];

export const WATER_GOAL_OPTIONS = [1500, 2000, 2500, 3000];
export const DEFAULT_WATER_GOAL = 2000;
export const DEFAULT_GOAL_COUNT = 10;

/** Landing page (same domain) — where the person goes after deleting their account. */
export const SITE_URL = '/';
