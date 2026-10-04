'use client';

import { BottomNav } from '@/components/BottomNav';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { useStats } from '@/lib/hooks';
import { pluralizeDays } from '@/lib/shared/dates';
import type { StatsDayPoint } from '@/lib/shared/types';

/** Weekly bar chart. A zero day still gets a small grey stub so "0" is visible. */
function BarChart({ points, max }: { points: StatsDayPoint[]; max: number }) {
  return (
    <div className="stats-bar-chart">
      {points.map((p) => {
        const height = p.value > 0 && max > 0 ? Math.max(8, Math.round((p.value / max) * 100)) : 5;
        return (
          <div key={p.date} className="stats-bar-col" title={String(p.value)}>
            <div className={'stats-bar' + (p.value > 0 ? '' : ' empty')} style={{ height: `${height}%` }} />
            <span>{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const { stats, isLoading } = useStats();
  const maxWater = stats ? Math.max(0, ...stats.waterWeek.map((d) => d.value)) : 0;

  return (
    <section id="screen-stats" className="screen active">
      <ScreenBackground className="stats-bg-photo" src="/images/stats-bg.jpg" />
      <div className="stats-scroll">
        <StatusBar />
        <ScreenHeader className="stats-page-header" subtitleClassName="stats-subtitle" title="Статистика" subtitle="Анализ эффективности" />

        {isLoading || !stats ? (
          <div className="screen-loading">Считаем статистику…</div>
        ) : (
          <>
            <div className="stats-summary-row">
              <div className="stats-summary-card">
                <p className="stats-summary-label">Лучшая серия</p>
                <p className="stats-summary-value">
                  {stats.bestStreak ? `${stats.bestStreak.days} ${pluralizeDays(stats.bestStreak.days)}` : '0 дней'}
                </p>
                <p className="stats-summary-note">{stats.bestStreak?.habitTitle ?? 'Пока нет серий'}</p>
              </div>
              <div className="stats-summary-card">
                <p className="stats-summary-label">Ср. выполнение</p>
                <p className="stats-summary-value">{stats.monthAverage === null ? '—' : `${stats.monthAverage}%`}</p>
                <p className="stats-summary-note slate">Текущий месяц</p>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-head"><h3>Выполнение привычек по дням</h3></div>
              <BarChart points={stats.habitsWeek} max={100} />
            </div>

            <div className="stats-card">
              <div className="stats-card-head">
                <h3>Тренды воды</h3>
                <span className="stats-card-pill">За неделю</span>
              </div>
              <BarChart points={stats.waterWeek} max={maxWater} />
              <div className="stats-water-foot">
                <span className="stats-water-avg">Среднее: {(stats.waterAverage / 1000).toFixed(1)}л / день</span>
                {stats.waterChangePct !== null ? (
                  <span className={'stats-water-change' + (stats.waterChangePct < 0 ? ' negative' : '')}>
                    {stats.waterChangePct >= 0 ? '+' : ''}{stats.waterChangePct}% к прош. неделе
                  </span>
                ) : (
                  <span className="stats-water-change">Прошлая неделя без данных</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </section>
  );
}
