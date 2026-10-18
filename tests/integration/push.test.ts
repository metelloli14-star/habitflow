import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The browser push services are replaced by a recorder: tests check who gets what, not Google's servers.
const sendNotification = vi.hoisted(() => vi.fn());
vi.mock('web-push', async (importOriginal) => {
  const actual = await importOriginal<{ default?: typeof import('web-push') } & typeof import('web-push')>();
  const lib = actual.default ?? actual; // CommonJS module
  return { ...lib, default: { ...lib, sendNotification }, sendNotification };
});

import { generateVAPIDKeys, WebPushError } from 'web-push';
import { findUserById, prisma, toDbDate } from '@/db';
import { removePushSubscription, savePushSubscription } from '@/lib/server/services/push';
import { sendDueReminders, sendWaterReminders, sendWeeklySummaries, weekSummary } from '@/lib/server/services/reminders';
import { addWater } from '@/lib/server/services/water';
import { makeSession, makeUser, resetDb } from '../helpers';

const send = sendNotification;
const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) } });
// 2026-10-18 22:00 UTC = Monday 2026-10-19 08:00 in Vladivostok
const NOW = new Date('2026-10-18T22:00:00Z');
const TZ = 'Asia/Vladivostok';

beforeAll(() => {
  const keys = generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
});

beforeEach(async () => {
  await resetDb();
  send.mockReset();
  send.mockResolvedValue({ statusCode: 201, body: '', headers: {} });
});

describe('subscriptions', () => {
  it('saves a device, remembers the time zone, one subscription per login', async () => {
    const user = await makeUser();
    const session = await makeSession(user.id);
    await savePushSubscription(session.id, user.id, sub('https://fcm.googleapis.com/fcm/send/one'), 'Asia/Yekaterinburg');
    await savePushSubscription(session.id, user.id, sub('https://web.push.apple.com/two'), 'Not/AZone');
    const rows = await prisma.pushSubscription.findMany();
    expect(rows.map((r) => r.endpoint)).toEqual(['https://web.push.apple.com/two']);
    expect((await findUserById(user.id))?.timeZone).toBe('Asia/Yekaterinburg');
  });

  it('refuses bad addresses and keys', async () => {
    const user = await makeUser();
    const session = await makeSession(user.id);
    await expect(savePushSubscription(session.id, user.id, sub('https://127.0.0.1/x'), 'UTC')).rejects.toMatchObject({ code: 'invalid_subscription' });
    await expect(savePushSubscription(session.id, user.id, { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'x', auth: 'y' } }, 'UTC'))
      .rejects.toMatchObject({ code: 'invalid_subscription' });
  });

  it('logging out (session deleted) or turning off removes the device', async () => {
    const user = await makeUser();
    const a = await makeSession(user.id);
    const b = await makeSession(user.id);
    await savePushSubscription(a.id, user.id, sub('https://fcm.googleapis.com/fcm/send/a'), 'UTC');
    await savePushSubscription(b.id, user.id, sub('https://fcm.googleapis.com/fcm/send/b'), 'UTC');
    await prisma.session.delete({ where: { id: a.id } });
    await removePushSubscription(b.id);
    expect(await prisma.pushSubscription.count()).toBe(0);
  });

  it('is unavailable without VAPID keys', async () => {
    const saved = process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    const user = await makeUser();
    const session = await makeSession(user.id);
    await expect(savePushSubscription(session.id, user.id, sub('https://fcm.googleapis.com/x'), 'UTC')).rejects.toMatchObject({ code: 'push_unavailable' });
    process.env.VAPID_PRIVATE_KEY = saved;
  });
});

describe('habit reminders', () => {
  async function setup() {
    const user = await makeUser();
    await prisma.user.update({ where: { id: user.id }, data: { timeZone: TZ } });
    const session = await makeSession(user.id, new Date(NOW.getTime() - 86_400_000));
    await savePushSubscription(session.id, user.id, sub('https://fcm.googleapis.com/fcm/send/phone'), TZ);
    const habit = (title: string, reminderTime: string) => prisma.habit.create({
      data: { userId: user.id, title, category: 'Здоровье', frequency: 'Ежедневно', reminderTime, createdAt: new Date('2026-10-01T00:00:00Z') },
    });
    return { user, session, habit };
  }

  it('sends "Пора: …" at the local time, once; skips done habits and other times', async () => {
    const { user, habit } = await setup();
    const due = await habit('Медитация', '08:00');
    await habit('Бег', '19:00');
    const done = await habit('Вода утром', '07:55');
    await prisma.completion.create({ data: { userId: user.id, habitId: done.id, date: toDbDate('2026-10-19') } });

    expect(await sendDueReminders(NOW)).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    const [target, payload, options] = send.mock.calls[0];
    expect(target.endpoint).toBe('https://fcm.googleapis.com/fcm/send/phone');
    expect(JSON.parse(payload as string)).toEqual({ title: 'Привычка', body: 'Пора: Медитация', tag: `habit-${due.id}`, url: '/home' });
    expect(options).toMatchObject({ TTL: 3600, urgency: 'high' });

    expect(await sendDueReminders(NOW)).toBe(0); // same minute again
    expect(await sendDueReminders(new Date(NOW.getTime() + 60_000))).toBe(0); // next minute
    expect(await sendDueReminders(new Date(NOW.getTime() + 86_400_000))).toBeGreaterThanOrEqual(1); // tomorrow
  });

  it('drops a device the push service says is gone', async () => {
    const { user, session, habit } = await setup();
    await habit('Медитация', '08:00');
    const other = await makeSession(user.id);
    await savePushSubscription(other.id, user.id, sub('https://fcm.googleapis.com/fcm/send/old'), TZ);
    send.mockImplementation(async (target) => {
      if (target.endpoint.endsWith('/old')) throw new WebPushError('Gone', 410, {}, '', target.endpoint);
      return { statusCode: 201, body: '', headers: {} };
    });
    await sendDueReminders(NOW);
    expect(send).toHaveBeenCalledTimes(2);
    expect((await prisma.pushSubscription.findMany()).map((s) => s.sessionId)).toEqual([session.id]);
  });

  it('nothing for a login that has expired', async () => {
    const { session, habit } = await setup();
    await habit('Медитация', '08:00');
    await prisma.session.update({ where: { id: session.id }, data: { createdAt: new Date(NOW.getTime() - 31 * 86_400_000) } });
    expect(await sendDueReminders(NOW)).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('water and weekly notifications', () => {
  // 2026-10-18 is a Sunday. 11:00 UTC = 14:00 Moscow, 17:00 UTC = 20:00 Moscow.
  async function phone() {
    const user = await makeUser();
    const session = await makeSession(user.id, new Date('2026-10-18T00:00:00Z'));
    await savePushSubscription(session.id, user.id, sub('https://fcm.googleapis.com/fcm/send/phone'), 'Europe/Moscow');
    return user;
  }
  const payloadOf = (call: number) => JSON.parse(send.mock.calls[call][1] as string);

  it('reminds to drink water while the goal is not reached, once per slot', async () => {
    const user = await phone();
    await addWater(user, '2026-10-18', 500, '09:00');
    const at = new Date('2026-10-18T11:00:00Z');
    expect(await sendWaterReminders(at)).toBe(1);
    expect(payloadOf(0)).toEqual({ title: 'Привычка', body: 'Пора выпить воды 💧 Сегодня 0,5 из 2,0 л', tag: 'water', url: '/water' });
    expect(await sendWaterReminders(new Date(at.getTime() + 60_000))).toBe(0);
    expect(await sendWaterReminders(new Date('2026-10-18T09:30:00Z'))).toBe(0); // 12:30 — between slots
  });

  it('no water reminder once the goal is reached or when turned off', async () => {
    const user = await phone();
    await addWater(user, '2026-10-18', 2000, '09:00');
    expect(await sendWaterReminders(new Date('2026-10-18T11:00:00Z'))).toBe(0);
    const other = await phone();
    await prisma.user.update({ where: { id: other.id }, data: { waterReminders: false } });
    expect(await sendWaterReminders(new Date('2026-10-18T13:00:00Z'))).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('weekly summary on Sunday evening with the share of done habit-days', async () => {
    const user = await phone();
    const h = await prisma.habit.create({ data: { userId: user.id, title: 'Бег', category: 'Здоровье', frequency: 'Ежедневно', createdAt: new Date('2026-10-01T00:00:00Z') } });
    for (const d of ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']) {
      await prisma.completion.create({ data: { userId: user.id, habitId: h.id, date: toDbDate(d) } });
    }
    expect(await weekSummary(user.id, '2026-10-18')).toEqual({ scheduled: 7, done: 6 });
    expect(await sendWeeklySummaries(new Date('2026-10-18T17:00:00Z'))).toBe(1);
    expect(payloadOf(0)).toMatchObject({ title: 'Итоги недели', body: 'Выполнено 86% привычек (6 из 7). Отличная неделя! 💪', url: '/stats' });
    expect(await sendWeeklySummaries(new Date('2026-10-18T17:05:00Z'))).toBe(0); // once
  });

  it('no summary for someone without habits or with it turned off', async () => {
    await phone();
    const off = await phone();
    await prisma.habit.create({ data: { userId: off.id, title: 'x', category: 'Хобби', frequency: 'Ежедневно', createdAt: new Date('2026-10-01T00:00:00Z') } });
    await prisma.user.update({ where: { id: off.id }, data: { weeklySummary: false } });
    expect(await sendWeeklySummaries(new Date('2026-10-18T17:00:00Z'))).toBe(0);
  });
});
