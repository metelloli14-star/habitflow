import { describe, expect, it } from 'vitest';
import type { HabitRecord } from '@/db/schema';
import { decodeAvatar } from '@/lib/server/services/avatar';
import { computeStreak } from '@/lib/server/services/habits';
import { CATCH_UP_MINUTES, dueWaterSlot, isReminderDue, isWeeklySummaryDue, weeklySummaryText } from '@/lib/server/services/reminders';
import { ApiError } from '@/lib/server/http';
import { TINY_JPEG, TINY_PNG } from '../fixtures';

const habit = (over: Partial<HabitRecord> = {}): HabitRecord => ({
  id: 'h1', userId: 'u1', title: 'Зарядка', category: 'Здоровье', frequency: 'Ежедневно', days: [], reminderTime: '',
  goal: null, createdAt: '2026-10-01T09:00:00.000Z', ...over,
});

describe('streak', () => {
  it('counts consecutive done days back from today', () => {
    expect(computeStreak(habit(), new Set(['2026-10-16', '2026-10-17', '2026-10-18']), '2026-10-18')).toBe(3);
  });

  it('an unfinished today does not break the streak yet', () => {
    expect(computeStreak(habit(), new Set(['2026-10-16', '2026-10-17']), '2026-10-18')).toBe(2);
  });

  it('a missed day breaks it', () => {
    expect(computeStreak(habit(), new Set(['2026-10-15', '2026-10-17']), '2026-10-18')).toBe(1);
  });

  it('days the habit is not scheduled on are skipped', () => {
    const weekly = habit({ frequency: 'Еженедельно', days: ['Пн', 'Ср', 'Пт'] });
    // Mon 12, Wed 14, Fri 16 done; today is Sunday 18 (not scheduled)
    expect(computeStreak(weekly, new Set(['2026-10-12', '2026-10-14', '2026-10-16']), '2026-10-18')).toBe(3);
  });

  it('does not count days before the habit existed', () => {
    expect(computeStreak(habit({ createdAt: '2026-10-17T08:00:00.000Z' }), new Set(['2026-10-17', '2026-10-18']), '2026-10-18')).toBe(2);
  });
});

describe('push reminder timing', () => {
  const daily = { frequency: 'Ежедневно', days: [] as string[], reminderTime: '08:00', createdAt: new Date('2026-01-01T00:00:00Z') };
  const at = (iso: string) => new Date(iso);

  it('is due at the reminder time in the person\'s time zone', () => {
    expect(isReminderDue(daily, 'Europe/Moscow', at('2026-10-18T05:00:30Z'))).toBe(true);
    expect(isReminderDue(daily, 'Asia/Vladivostok', at('2026-10-17T22:00:00Z'))).toBe(true);
  });

  it('not before the time, and only within the catch-up window after it', () => {
    expect(isReminderDue(daily, 'Europe/Moscow', at('2026-10-18T04:59:00Z'))).toBe(false);
    expect(isReminderDue(daily, 'Europe/Moscow', new Date(Date.parse('2026-10-18T05:00:00Z') + CATCH_UP_MINUTES * 60_000))).toBe(true);
    expect(isReminderDue(daily, 'Europe/Moscow', new Date(Date.parse('2026-10-18T05:00:00Z') + (CATCH_UP_MINUTES + 1) * 60_000))).toBe(false);
  });

  it('skips days the habit is not scheduled on', () => {
    const mondays = { ...daily, frequency: 'Еженедельно', days: ['Пн'] };
    expect(isReminderDue(mondays, 'Europe/Moscow', at('2026-10-18T05:00:00Z'))).toBe(false); // Sunday
    expect(isReminderDue(mondays, 'Europe/Moscow', at('2026-10-19T05:00:00Z'))).toBe(true); // Monday
  });

  it('a habit created after its reminder time today waits until tomorrow', () => {
    const created = { ...daily, createdAt: at('2026-10-18T05:03:00Z') }; // 08:03 Moscow
    expect(isReminderDue(created, 'Europe/Moscow', at('2026-10-18T05:05:00Z'))).toBe(false);
    expect(isReminderDue(created, 'Europe/Moscow', at('2026-10-19T05:00:00Z'))).toBe(true);
  });

  it('no reminder time — never due', () => {
    expect(isReminderDue({ ...daily, reminderTime: '' }, 'Europe/Moscow', at('2026-10-18T05:00:00Z'))).toBe(false);
  });
});

describe('water and weekly push timing', () => {
  it('water reminders every 2 hours from 10:00 to 20:00 local time', () => {
    expect(dueWaterSlot('Europe/Moscow', new Date('2026-10-18T07:02:00Z'))).toBe('water-10'); // 10:02 Moscow
    expect(dueWaterSlot('Europe/Moscow', new Date('2026-10-18T17:00:00Z'))).toBe('water-20');
    expect(dueWaterSlot('Europe/Moscow', new Date('2026-10-18T08:00:00Z'))).toBeNull(); // 11:00
    expect(dueWaterSlot('Europe/Moscow', new Date('2026-10-18T19:00:00Z'))).toBeNull(); // 22:00
  });

  it('weekly summary on Sunday at 20:00 only', () => {
    expect(isWeeklySummaryDue('Europe/Moscow', new Date('2026-10-18T17:01:00Z'))).toBe(true); // Sun 20:01
    expect(isWeeklySummaryDue('Europe/Moscow', new Date('2026-10-17T17:01:00Z'))).toBe(false); // Saturday
    expect(isWeeklySummaryDue('Europe/Moscow', new Date('2026-10-18T16:59:00Z'))).toBe(false); // 19:59
  });

  it('summary text depends on how the week went', () => {
    expect(weeklySummaryText(85, 17, 20)).toBe('Выполнено 85% привычек (17 из 20). Отличная неделя! 💪');
    expect(weeklySummaryText(60, 6, 10)).toContain('так держать');
    expect(weeklySummaryText(20, 2, 10)).toContain('Новая неделя');
  });
});

describe('profile photo decoding', () => {
  it('turns a data URL into bytes and a MIME type', () => {
    expect(decodeAvatar(TINY_PNG).mimeType).toBe('image/png');
    const jpeg = decodeAvatar(TINY_JPEG);
    expect(jpeg.mimeType).toBe('image/jpeg');
    expect([...jpeg.data.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it('refuses content that is not the claimed image type', () => {
    const fakeJpeg = `data:image/jpeg;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
    expect(() => decodeAvatar(fakeJpeg)).toThrow(ApiError);
    const pngClaimedAsJpeg = TINY_PNG.replace('image/png', 'image/jpeg');
    expect(() => decodeAvatar(pngClaimedAsJpeg)).toThrow(ApiError);
  });
});
