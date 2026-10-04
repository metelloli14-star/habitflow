'use client';

import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { CheckIcon, DropIcon, TargetIcon } from '@/components/icons';
import { useHabits, useSession, useWater } from '@/lib/hooks';
import { formatDayHeading, isHabitScheduledOn } from '@/lib/shared/dates';

const RING_CIRCUMFERENCE = 169.6; // 2π · r(27)

function progressTitle(pct: number) {
  if (pct === 100) return 'Все привычки выполнены!';
  if (pct >= 50) return 'Отличный темп!';
  if (pct > 0) return 'Хорошее начало!';
  return 'Пора начинать!';
}

export default function HomePage() {
  const { user } = useSession();
  const { habits, isLoading, toggleHabit, today } = useHabits();
  const { day: water, addWater } = useWater();

  const todays = today ? habits.filter((h) => isHabitScheduledOn(h, today)) : [];
  const done = todays.filter((h) => h.doneToday).length;
  const pct = todays.length ? Math.round((done / todays.length) * 100) : 0;
  const waterGoal = water?.goal ?? user?.waterGoal ?? 2000;
  const waterAmount = water?.amount ?? 0;

  let progressHeading = 'Пока нет данных';
  let progressText = 'Создайте привычки чтобы начать отслеживание';
  if (habits.length > 0 && todays.length === 0) progressText = 'На сегодня привычек не запланировано';
  if (todays.length > 0) {
    progressHeading = progressTitle(pct);
    progressText = `Выполнено ${done} из ${todays.length} привычек на сегодня.`;
  }

  return (
    <section id="screen-home" className="screen active">
      <ScreenBackground className="home-bg-photo" src="/images/home-bg.jpg" />
      <div className="home-scroll">
        <StatusBar />
        <ScreenHeader
          className="home-header"
          subtitleClassName="home-date"
          title={`Привет, ${(user?.name ?? '').split(' ')[0] || '…'}!`}
          subtitle={today ? formatDayHeading(today) : '\u00a0'}
        />

        <div className="home-card progress-card">
          <div className="progress-ring">
            <svg viewBox="0 0 64 64">
              <circle className="ring-bg" cx="32" cy="32" r="27" />
              <circle className="ring-fg" cx="32" cy="32" r="27" strokeDasharray={RING_CIRCUMFERENCE}
                style={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - pct / 100) }} />
            </svg>
            <div className="ring-label">{pct}%</div>
          </div>
          <div className="progress-text">
            <h3>{progressHeading}</h3>
            <p>{progressText}</p>
          </div>
        </div>

        <div className="home-card water-card">
          <div className="water-icon"><DropIcon /></div>
          <div className="water-info">
            <h3>Водный баланс</h3>
            <p>{waterAmount} мл из {waterGoal} мл ({Math.floor((waterAmount / waterGoal) * 100)}%)</p>
          </div>
          <button className="water-add-btn" onClick={() => addWater(250)}>+250 мл</button>
        </div>

        <div className="habits-section-head">
          <h2>Сегодняшние привычки</h2>
          <Link href="/habits" className="habits-all-link">Все ({habits.length})</Link>
        </div>

        {isLoading ? (
          <div className="screen-loading">Загружаем привычки…</div>
        ) : habits.length === 0 ? (
          <div className="habits-empty-card">
            <div className="habits-empty-icon"><TargetIcon /></div>
            <h3>У вас пока нет привычек</h3>
            <p>Начните отслеживать свои привычки прямо сейчас</p>
            <Link href="/habits/new" className="habits-create-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>Создать привычку</Link>
          </div>
        ) : todays.length === 0 ? (
          <div className="today-empty-note-card">
            <h3>На сегодня ничего не запланировано</h3>
            <p>Привычки, отмеченные на сегодняшний день, появятся здесь</p>
          </div>
        ) : (
          <div className="today-habits-list">
            {todays.map((h) => (
              <button key={h.id} type="button" className={'today-habit-row' + (h.doneToday ? ' done' : '')}
                aria-pressed={h.doneToday} onClick={() => toggleHabit(h.id)}
                style={{ width: '100%', border: 'none', textAlign: 'left', font: 'inherit' }}>
                <div className="today-habit-check"><CheckIcon /></div>
                <div className="today-habit-info">
                  <h4>{h.title}</h4>
                  <p>{h.category} • {h.frequency}</p>
                </div>
                {h.goal && (
                  <span className="today-habit-goal-badge" title="Прогресс цели">
                    {Math.min(h.progressDone, h.goal.targetCount)}/{h.goal.targetCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </section>
  );
}
