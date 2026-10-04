'use client';

import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { TrophyIcon } from '@/components/icons';
import { useHabits } from '@/lib/hooks';
import { daysBetween, formatLongDate, pluralizeDays } from '@/lib/shared/dates';
import type { HabitDTO } from '@/lib/shared/types';

function remainingText(h: HabitDTO, today: string) {
  const goal = h.goal!;
  const left = Math.max(0, goal.targetCount - h.progressDone);
  if (left === 0) return <><b>Цель достигнута!</b> Отличная работа.</>;
  const days = daysBetween(today, goal.deadline);
  const deadline =
    days > 0 ? ` Осталось ${days} ${pluralizeDays(days)} до ${formatLongDate(goal.deadline)}.`
    : days === 0 ? ' Срок — сегодня.'
    : ` Срок истёк ${formatLongDate(goal.deadline)}.`;
  return <>Осталось сделать: <b>{left}</b> из {goal.targetCount}.{deadline}</>;
}

export default function GoalsPage() {
  const { habits, isLoading, today } = useHabits();
  const withGoals = habits.filter((h) => h.goal);

  return (
    <section id="screen-goals" className="screen active">
      <ScreenBackground className="goals-bg-photo" src="/images/goals-bg.jpg" />
      <div className="goals-scroll">
        <StatusBar />
        <ScreenHeader className="goals-page-header" subtitleClassName="goals-subtitle" title="Цель" subtitle="Испытай себя!" />
        <div className="goals-list">
          {isLoading || !today ? (
            <div className="screen-loading">Загрузка…</div>
          ) : withGoals.length === 0 ? (
            <div className="goals-empty-card">
              <div className="goals-empty-icon"><TrophyIcon /></div>
              <h3>Пока у вас нет целей</h3>
              <p>Цель создаётся вместе с привычкой: укажите её название, сколько раз нужно выполнить и срок.</p>
              <Link href="/habits/new" className="goals-empty-cta" style={{ textAlign: 'center', textDecoration: 'none' }}>Создать привычку</Link>
            </div>
          ) : (
            withGoals.map((h) => {
              const goal = h.goal!;
              const done = Math.min(h.progressDone, goal.targetCount);
              const pct = Math.round((done / goal.targetCount) * 100);
              return (
                <Link key={h.id} href={`/habits/${h.id}`} className="challenge-card" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                  <span className="challenge-badge">Цель привычки «{h.title}»</span>
                  <h2>{goal.title}</h2>
                  {goal.description && <p className="challenge-desc">{goal.description}</p>}
                  <div className="challenge-progress-row">
                    <span className="challenge-days">{done} из {goal.targetCount} выполнено</span>
                    <span className="challenge-percent">{pct}%</span>
                  </div>
                  <div className="challenge-progress-track">
                    <div className="challenge-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="challenge-remaining">{remainingText(h, today)}</p>
                </Link>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />
    </section>
  );
}
