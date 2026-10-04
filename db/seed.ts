// Demo data created the first time the mock database starts (or after `npm run db:reset`).
// Log in with demo@habitflow.ru / demo12345 to see every screen filled in.

import { randomUUID } from 'node:crypto';
import { addDays, isHabitScheduledOn, todayStr } from '@/lib/shared/dates';
import { hashPassword } from '@/lib/server/password';
import { emptyDatabase, type DatabaseShape, type HabitRecord } from './schema';

export function createSeedData(): DatabaseShape {
  const data = emptyDatabase();
  const today = todayStr();
  const now = new Date().toISOString();
  const userId = randomUUID();

  data.users.push({
    id: userId,
    name: 'Ольга',
    email: 'demo@habitflow.ru',
    passwordHash: hashPassword('demo12345'),
    gender: 'Женский',
    avatar: null,
    waterGoal: 2000,
    emailVerified: true,
    firstUseDate: addDays(today, -20),
    createdAt: now,
  });

  const createdAt = new Date(Date.now() - 20 * 86_400_000).toISOString();
  const habits: HabitRecord[] = [
    {
      id: randomUUID(), userId, title: 'Утренняя медитация', category: 'Разум', frequency: 'Ежедневно',
      days: [], reminderTime: '08:00', createdAt,
      goal: { title: '30 дней осознанности', description: 'Медитировать каждое утро', targetCount: 30, deadline: addDays(today, 60) },
    },
    {
      id: randomUUID(), userId, title: 'Пробежка 3 км', category: 'Здоровье', frequency: 'Еженедельно',
      days: ['Пн', 'Ср', 'Пт'], reminderTime: '', createdAt,
      goal: { title: 'Полумарафон', description: 'Подготовиться к забегу', targetCount: 20, deadline: addDays(today, 90) },
    },
    {
      id: randomUUID(), userId, title: 'Чтение книги', category: 'Хобби', frequency: 'Ежедневно',
      days: [], reminderTime: '', createdAt, goal: null,
    },
  ];
  data.habits.push(...habits);

  // Deterministic "history" for the last 14 days so streaks, goals and charts have something to show.
  const pattern = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
  for (let i = 14; i >= 1; i--) {
    const date = addDays(today, -i);
    habits.forEach((h, idx) => {
      if (!isHabitScheduledOn(h, date)) return;
      if (pattern[(i + idx) % pattern.length] === 1 || (idx === 0 && i <= 5)) {
        data.completions.push({ id: randomUUID(), userId, habitId: h.id, date, createdAt: now });
      }
    });
    const glasses = 4 + ((i * 3) % 5);
    for (let g = 0; g < glasses; g++) {
      data.waterEntries.push({
        id: randomUUID(), userId, date, amount: g % 3 === 0 ? 500 : 250,
        time: `${String(8 + g * 2).padStart(2, '0')}:15`, createdAt: now,
      });
    }
  }
  return data;
}
