// Demo data for development: `npm run db:seed` (or `npm run db:reset`, which recreates the database first).
// Log in with demo@habitflow.ru / demo12345 to see every screen filled in.
// Never run it against the production database — the demo password is public.

import { Prisma, prisma, toDbDate } from '@/db';
import { hashPassword } from '@/lib/server/password';
import { addDays, isHabitScheduledOn, todayStr } from '@/lib/shared/dates';
import type { HabitInput } from '@/lib/shared/types';

const DEMO_EMAIL = 'demo@habitflow.ru';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo data is for development only — refusing to seed with NODE_ENV=production.');
  }
  if (await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })) {
    console.info(`Demo account ${DEMO_EMAIL} already exists — nothing to do.`);
    return;
  }

  const today = todayStr();
  const user = await prisma.user.create({
    data: {
      name: 'Ольга',
      email: DEMO_EMAIL,
      passwordHash: hashPassword('demo12345'),
      gender: 'Женский',
      waterGoal: 2000,
      emailVerified: true,
      firstUseDate: toDbDate(addDays(today, -20)),
    },
  });

  const inputs: HabitInput[] = [
    {
      title: 'Утренняя медитация', category: 'Разум', frequency: 'Ежедневно', days: [], reminderTime: '08:00',
      goal: { title: '30 дней осознанности', description: 'Медитировать каждое утро', targetCount: 30, deadline: addDays(today, 60) },
    },
    {
      title: 'Пробежка 3 км', category: 'Здоровье', frequency: 'Еженедельно', days: ['Пн', 'Ср', 'Пт'], reminderTime: '',
      goal: { title: 'Полумарафон', description: 'Подготовиться к забегу', targetCount: 20, deadline: addDays(today, 90) },
    },
    {
      title: 'Чтение книги', category: 'Хобби', frequency: 'Ежедневно', days: [], reminderTime: '', goal: null,
    },
  ];
  const createdAt = Date.now() - 20 * 86_400_000;
  const habits = [];
  for (const [i, input] of inputs.entries()) {
    habits.push(await prisma.habit.create({
      data: {
        ...input,
        goal: input.goal ? { ...input.goal } : Prisma.DbNull,
        userId: user.id,
        createdAt: new Date(createdAt + i), // keeps the list in this order
      },
    }));
  }

  // Deterministic "history" for the last 14 days so streaks, goals and charts have something to show.
  const completions: Prisma.CompletionCreateManyInput[] = [];
  const water: Prisma.WaterEntryCreateManyInput[] = [];
  const pattern = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
  for (let i = 14; i >= 1; i--) {
    const date = addDays(today, -i);
    habits.forEach((h, idx) => {
      if (!isHabitScheduledOn(inputs[idx], date)) return;
      if (pattern[(i + idx) % pattern.length] === 1 || (idx === 0 && i <= 5)) {
        completions.push({ userId: user.id, habitId: h.id, date: toDbDate(date) });
      }
    });
    const glasses = 4 + ((i * 3) % 5);
    for (let g = 0; g < glasses; g++) {
      const time = `${String(8 + g * 2).padStart(2, '0')}:15`;
      water.push({
        userId: user.id, date: toDbDate(date), amount: g % 3 === 0 ? 500 : 250, time,
        createdAt: new Date(`${date}T${time}:00`),
      });
    }
  }
  await prisma.completion.createMany({ data: completions });
  await prisma.waterEntry.createMany({ data: water });
  console.info(`Demo account created: ${DEMO_EMAIL} / demo12345`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
