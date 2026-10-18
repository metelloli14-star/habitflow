'use client';

import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { useSession, useStats, useToday } from '@/lib/hooks';
import { DEFAULT_WATER_GOAL } from '@/lib/shared/constants';
import { formatWeekRange, pluralizeDays } from '@/lib/shared/dates';
import type { StatsDayPoint } from '@/lib/shared/types';

type Tone = 'full' | 'part' | 'water' | 'zero';

interface ChartProps {
  points: StatsDayPoint[];
  today: string | null;
  /** Value at the top of the chart. */
  max: number;
  format: (value: number) => string;
  tone: (value: number) => Tone;
  /** Dashed target line (e.g. the daily water goal). */
  goal?: number;
}

/**
 * A week of bars with the value above each one. Today is highlighted; days that haven't come yet
 * stay empty (so they don't look like failures); a zero day gets a small grey stub.
 */
function WeekChart({ points, today, max, format, tone, goal }: ChartProps) {
  return (
    <div className="wk-chart">
      <div className="wk-area">
        {goal !== undefined && <div className="wk-goal" style={{ bottom: `${Math.min(100, (goal / max) * 100)}%` }} />}
        {points.map((p) => {
          const future = today !== null && p.date > today;
          const height = p.value > 0 ? Math.max(6, Math.min(100, (p.value / max) * 100)) : 0;
          return (
            <div key={p.date} className={'wk-col' + (p.date === today ? ' today' : '')}>
              {!future && <span className="wk-value">{format(p.value)}</span>}
              {!future && <div className={`wk-bar ${tone(p.value)}`} style={{ height: p.value > 0 ? `${height}%` : undefined }} />}
            </div>
          );
        })}
      </div>
      <div className="wk-labels">
        {points.map((p) => (
          <span key={p.date} className={p.date === today ? 'today' : today !== null && p.date > today ? 'future' : ''}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

const liters = (ml: number) => (ml / 1000).toFixed(1).replace('.', ',');

export default function StatsPage() {
  const { stats, isLoading } = useStats();
  const { user } = useSession();
  const today = useToday();
  const goal = user?.waterGoal ?? DEFAULT_WATER_GOAL;

  const week = stats?.habitsWeek ?? [];
  const range = week.length ? formatWeekRange(week[0].date, week[week.length - 1].date) : '';
  const todayPct = stats?.habitsWeek.find((p) => p.date === today)?.value ?? null;
  const waterMax = stats ? Math.max(goal, ...stats.waterWeek.map((d) => d.value)) * 1.15 : goal;
  const change = stats?.waterChangePct ?? null;

  return (
    <section id="screen-stats" className="screen active">
      <ScreenBackground className="stats-bg-photo" src="/images/stats-bg.jpg" />
      <div className="stats-scroll">
        <StatusBar />
        <ScreenHeader className="stats-page-header" subtitleClassName="stats-subtitle" title="Статистика" subtitle={range ? `Неделя ${range}` : 'Анализ эффективности'} />

        {isLoading || !stats ? (
          <div className="screen-loading">Считаем статистику…</div>
        ) : (
          <>
            <div className="stats-summary-row">
              <div className="stats-summary-card">
                <p className="stats-summary-label">Сегодня</p>
                <p className="stats-summary-value">{todayPct === null ? '—' : `${todayPct}%`}</p>
                <div className="stats-mini-bar" aria-hidden="true">
                  <span className={todayPct === 100 ? 'full' : ''} style={{ width: `${todayPct ?? 0}%` }} />
                </div>
                <p className="stats-summary-note slate">привычек выполнено</p>
              </div>
              <div className="stats-summary-card">
                <p className="stats-summary-label">Лучшая серия</p>
                <p className="stats-summary-value">
                  {stats.bestStreak ? `${stats.bestStreak.days} ${pluralizeDays(stats.bestStreak.days)}` : '0 дней'}
                </p>
                <p className="stats-summary-note">{stats.bestStreak?.habitTitle ?? 'Пока нет серий'}</p>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-head">
                <h3>Привычки за неделю</h3>
                <span className="stats-card-pill">{stats.monthAverage === null ? 'месяц: —' : `за месяц ${stats.monthAverage}%`}</span>
              </div>
              <p className="stats-card-hint">Какая доля запланированных привычек выполнена в каждый день</p>
              <WeekChart
                points={stats.habitsWeek}
                today={today}
                max={100}
                format={(v) => `${v}%`}
                tone={(v) => (v >= 100 ? 'full' : v > 0 ? 'part' : 'zero')}
              />
              <div className="wk-legend">
                <span><i className="full" />все</span>
                <span><i className="part" />частично</span>
                <span><i className="zero" />ни одной</span>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-head">
                <h3>Вода за неделю</h3>
                <span className="stats-card-pill goal">цель {liters(goal)} л</span>
              </div>
              <WeekChart
                points={stats.waterWeek}
                today={today}
                max={waterMax}
                format={(v) => (v > 0 ? liters(v) : '0')}
                tone={(v) => (v >= goal ? 'full' : v > 0 ? 'water' : 'zero')}
                goal={goal}
              />
              <div className="wk-legend">
                <span><i className="full" />цель выполнена</span>
                <span><i className="water" />меньше цели</span>
                <span><i className="goal-line" />цель</span>
              </div>
              <div className="stats-water-foot">
                <span className="stats-water-avg">В среднем <b>{liters(stats.waterAverage)} л</b> в день</span>
                {change !== null ? (
                  <span className={'stats-water-change' + (change < 0 ? ' negative' : '')}>
                    {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% к прошлой неделе
                  </span>
                ) : (
                  <span className="stats-water-change muted">Прошлая неделя без данных</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
