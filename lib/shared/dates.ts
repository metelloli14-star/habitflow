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

/** Calendar day ('YYYY-MM-DD') and minutes since midnight at moment `at` in an IANA time zone, e.g. 'Europe/Moscow'. */
export function zonedNow(timeZone: string, at: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Human-readable schedule for habit lists: «Каждый день», «Пн, Ср, Пт», «1 и 15 числа». */
export function scheduleLabel(habit: { frequency: Frequency; days: string[] }): string {
  if (habit.frequency === 'Ежедневно') return 'Каждый день';
  if (habit.frequency === 'Еженедельно') {
    const days = WEEKDAYS.filter((d) => habit.days.includes(d));
    if (days.length === 7) return 'Каждый день';
    return days.length ? days.join(', ') : 'Дни не выбраны';
  }
  const dates = habit.days.map(Number).filter((n) => n > 0).sort((a, b) => a - b);
  if (!dates.length) return 'Числа не выбраны';
  if (dates.length > 4) return `${dates.length} дн. в месяц`;
  return `${dates.length > 1 ? `${dates.slice(0, -1).join(', ')} и ${dates[dates.length - 1]}` : dates[0]} числа`;
}

/** «12–18 октября» or «29 сентября – 5 октября». */
export function formatWeekRange(start: string, end: string): string {
  const a = parseDateStr(start);
  const b = parseDateStr(end);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS_GENITIVE[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS_GENITIVE[a.getMonth()]} – ${b.getDate()} ${MONTHS_GENITIVE[b.getMonth()]}`;
}
