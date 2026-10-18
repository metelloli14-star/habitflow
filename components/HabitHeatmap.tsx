'use client';

import { useHabitHistory } from '@/lib/hooks';
import { addDays, isHabitScheduledOn, startOfWeek, toDateStr } from '@/lib/shared/dates';
import type { HabitDTO } from '@/lib/shared/types';

const MAX_WEEKS = 16;
const MIN_WEEKS = 8;
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const ROW_LABELS = ['Пн', '', 'Ср', '', 'Пт', '', ''];

type Cell = 'done' | 'missed' | 'pending' | 'off' | 'empty';

/**
 * History of a habit, one square per day (columns are weeks, Monday on top): green — done, grey — missed,
 * faint — not scheduled; today is outlined. Covers the habit's life: from 8 weeks (a new habit) up to 16.
 */
export function HabitHeatmap({ habit, today }: { habit: HabitDTO; today: string }) {
  const habitStart = toDateStr(new Date(habit.createdAt));
  const thisWeek = startOfWeek(today);
  const age = Math.floor((Date.parse(thisWeek) - Date.parse(startOfWeek(habitStart))) / (7 * 86_400_000)) + 1;
  const WEEKS = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, age));
  const start = addDays(thisWeek, -(WEEKS - 1) * 7);
  const { dates } = useHabitHistory(habit.id, start);
  const done = new Set(dates ?? []);

  let scheduled = 0;
  let completed = 0;
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      let state: Cell = 'empty';
      if (date <= today && date >= habitStart) {
        if (done.has(date)) state = 'done';
        else if (!isHabitScheduledOn(habit, date)) state = 'off';
        else state = date === today ? 'pending' : 'missed';
        if (state !== 'off') scheduled += 1;
        if (state === 'done') completed += 1;
      }
      return { date, state };
    }),
  );
  const pct = scheduled ? Math.round((completed / scheduled) * 100) : 0;

  // A month's name over the first week that starts in it; never in two neighbouring columns (they'd overlap).
  const monthLabels: string[] = [];
  let lastLabelAt = -2;
  weeks.forEach((days, w) => {
    const month = Number(days[0].date.slice(5, 7)) - 1;
    const prev = w > 0 ? Number(weeks[w - 1][0].date.slice(5, 7)) - 1 : -1;
    const startsMonth = w === 0 ? Number(days[0].date.slice(8, 10)) <= 7 : month !== prev;
    if (startsMonth && w - lastLabelAt > 2) {
      monthLabels[w] = MONTHS_SHORT[month];
      lastLabelAt = w;
    } else monthLabels[w] = '';
  });

  return (
    <div className="heatmap-card">
      <div className="heatmap-head">
        <h3>История выполнения</h3>
        <span className="stats-card-pill">{WEEKS} недель</span>
      </div>
      {dates === null ? (
        <div className="screen-loading">Загрузка…</div>
      ) : (
        <>
          <div className="heatmap">
            <div className="heatmap-rows" aria-hidden="true">
              <span />
              {ROW_LABELS.map((l, i) => <span key={i}>{l}</span>)}
            </div>
            {weeks.map((days, w) => {
              const label = monthLabels[w];
              return (
                <div key={days[0].date} className="heatmap-week">
                  <span className="heatmap-month">{label}</span>
                  {days.map((c) => (
                    <span key={c.date} className={`heatmap-cell ${c.state}` + (c.date === today ? ' today' : '')}
                      title={`${c.date}${c.state === 'done' ? ' — выполнено' : c.state === 'missed' ? ' — пропущено' : ''}`} />
                  ))}
                </div>
              );
            })}
          </div>
          <p className="heatmap-summary">
            {scheduled ? <>Выполнено <b>{completed}</b> из {scheduled} запланированных дней — <b>{pct}%</b></> : 'Пока нет запланированных дней'}
          </p>
          <div className="wk-legend">
            <span><i className="full" />выполнено</span>
            <span><i className="miss" />пропущено</span>
            <span><i className="offday" />не запланировано</span>
          </div>
        </>
      )}
    </div>
  );
}
