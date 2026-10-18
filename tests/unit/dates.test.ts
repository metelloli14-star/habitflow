import { describe, expect, it } from 'vitest';
import {
  addDays, formatWeekRange, isHabitScheduledOn, isValidDateStr, isValidTimeZone, scheduleLabel, startOfWeek, weekdayLabel, zonedNow,
} from '@/lib/shared/dates';

describe('calendar days', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('accepts only real YYYY-MM-DD dates', () => {
    expect(isValidDateStr('2026-02-28')).toBe(true);
    expect(isValidDateStr('2026-02-30')).toBe(false);
    expect(isValidDateStr('2026-2-1')).toBe(false);
    expect(isValidDateStr(20260101)).toBe(false);
  });

  it('weeks start on Monday', () => {
    expect(weekdayLabel('2026-10-18')).toBe('Вс');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
  });

  it('formats a week range in Russian', () => {
    expect(formatWeekRange('2026-10-12', '2026-10-18')).toBe('12–18 октября');
    expect(formatWeekRange('2026-09-28', '2026-10-04')).toBe('28 сентября – 4 октября');
  });
});

describe('habit schedule', () => {
  it('daily habits happen every day', () => {
    expect(isHabitScheduledOn({ frequency: 'Ежедневно', days: [] }, '2026-10-18')).toBe(true);
  });

  it('weekday habits happen only on the chosen weekdays', () => {
    const habit = { frequency: 'Еженедельно' as const, days: ['Пн', 'Ср'] };
    expect(isHabitScheduledOn(habit, '2026-10-12')).toBe(true); // Monday
    expect(isHabitScheduledOn(habit, '2026-10-13')).toBe(false); // Tuesday
  });

  it('monthly habits happen on the chosen dates', () => {
    const habit = { frequency: 'Ежемесячно' as const, days: ['1', '15'] };
    expect(isHabitScheduledOn(habit, '2026-10-15')).toBe(true);
    expect(isHabitScheduledOn(habit, '2026-10-16')).toBe(false);
  });

  it('describes the schedule the way lists show it', () => {
    expect(scheduleLabel({ frequency: 'Ежедневно', days: [] })).toBe('Каждый день');
    expect(scheduleLabel({ frequency: 'Еженедельно', days: ['Пт', 'Пн', 'Ср'] })).toBe('Пн, Ср, Пт');
    expect(scheduleLabel({ frequency: 'Еженедельно', days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] })).toBe('Каждый день');
    expect(scheduleLabel({ frequency: 'Еженедельно', days: [] })).toBe('Дни не выбраны');
    expect(scheduleLabel({ frequency: 'Ежемесячно', days: ['15', '1'] })).toBe('1 и 15 числа');
    expect(scheduleLabel({ frequency: 'Ежемесячно', days: ['10'] })).toBe('10 числа');
    expect(scheduleLabel({ frequency: 'Ежемесячно', days: ['1', '2', '3', '4', '5'] })).toBe('5 дн. в месяц');
  });
});

describe('time zones', () => {
  it('gives the local day and minutes in a time zone', () => {
    const at = new Date('2026-10-17T22:30:00Z');
    expect(zonedNow('Europe/Moscow', at)).toEqual({ date: '2026-10-18', minutes: 90 });
    expect(zonedNow('Asia/Vladivostok', at)).toEqual({ date: '2026-10-18', minutes: 8 * 60 + 30 });
    expect(zonedNow('America/New_York', at)).toEqual({ date: '2026-10-17', minutes: 18 * 60 + 30 });
  });

  it('midnight is 0, not 24', () => {
    expect(zonedNow('UTC', new Date('2026-10-18T00:05:00Z')).minutes).toBe(5);
  });

  it('recognises valid IANA zones only', () => {
    expect(isValidTimeZone('Europe/Moscow')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
  });
});
