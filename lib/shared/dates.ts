// Date helpers that work the same on the server and in the browser.
// All "dates" in the app are local calendar days in 'YYYY-MM-DD' form.

import type { Frequency } from './types';

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;
const WEEKDAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOMINATIVE = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toDateStr(parseDateStr(s)) === s;
}

export function addDays(s: string, n: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDateStr(b).getTime() - parseDateStr(a).getTime()) / 86_400_000);
}

export function weekdayLabel(s: string): (typeof WEEKDAYS)[number] {
  return WEEKDAYS[(parseDateStr(s).getDay() + 6) % 7];
}

/** Monday of the week that contains the given date. */
export function startOfWeek(s: string): string {
  const offset = (parseDateStr(s).getDay() + 6) % 7;
  return addDays(s, -offset);
}

export function startOfMonth(s: string): string {
  return s.slice(0, 8) + '01';
}

export function daysInMonth(s: string): number {
  const d = parseDateStr(s);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** 'Суббота, 26 сентября' */
export function formatDayHeading(s: string): string {
  const d = parseDateStr(s);
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`;
}

/** '31 декабря 2026' */
export function formatLongDate(s: string): string {
  const d = parseDateStr(s);
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

/** 'Сентябрь 2026' */
export function formatMonthTitle(s: string): string {
  const d = parseDateStr(s);
  return `${MONTHS_NOMINATIVE[d.getMonth()]} ${d.getFullYear()}`;
}

export function pluralizeDays(n: number): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'день';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'дня';
  return 'дней';
}

export function currentTimeHHMM(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isHabitScheduledOn(habit: { frequency: Frequency; days: string[] }, date: string): boolean {
  if (habit.frequency === 'Ежедневно') return true;
  if (habit.frequency === 'Еженедельно') return habit.days.includes(weekdayLabel(date));
  if (habit.frequency === 'Ежемесячно') return habit.days.includes(String(parseDateStr(date).getDate()));
  return false;
}
