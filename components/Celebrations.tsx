'use client';

import { useEffect, useRef, useState } from 'react';
import { trackGoal } from '@/lib/client/analytics';
import { haptic } from '@/lib/client/haptics';
import { useHabits } from '@/lib/hooks';
import { isHabitScheduledOn } from '@/lib/shared/dates';
import { CheckIcon, TrophyIcon } from './icons';

type Celebration = { kind: 'day' } | { kind: 'goal'; goalTitle: string; habitTitle: string; targetCount: number };

const DAY_KEY = 'habitflow_day_complete';
const GOALS_KEY = 'habitflow_goals_celebrated';

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Congratulations that pop up at the moment something is achieved (from any screen or the reminder banner):
 * - a goal reaches 100% — once per goal;
 * - the last habit of the day is marked — once a day.
 * Nothing pops up when the app merely opens with things already done.
 */
export function Celebrations() {
  const { habits, isLoading, today } = useHabits();
  const [queue, setQueue] = useState<Celebration[]>([]);
  const wasAllDone = useRef<boolean | null>(null);
  const progress = useRef(new Map<string, number>());

  const todays = today ? habits.filter((h) => isHabitScheduledOn(h, today)) : [];
  const allDone = todays.length > 0 && todays.every((h) => h.doneToday);

  useEffect(() => {
    if (isLoading || !today) return;
    const found: Celebration[] = [];

    // Goals that have just reached their target
    const celebrated = new Set<string>(JSON.parse(readStore(GOALS_KEY) || '[]') as string[]);
    for (const h of habits) {
      const before = progress.current.get(h.id);
      progress.current.set(h.id, h.progressDone);
      if (!h.goal || before === undefined) continue;
      const key = `${h.id}:${h.goal.targetCount}`;
      if (before < h.goal.targetCount && h.progressDone >= h.goal.targetCount && !celebrated.has(key)) {
        celebrated.add(key);
        found.push({ kind: 'goal', goalTitle: h.goal.title, habitTitle: h.title, targetCount: h.goal.targetCount });
      }
    }
    writeStore(GOALS_KEY, JSON.stringify([...celebrated].slice(-200)));

    // The whole day has just been completed
    if (wasAllDone.current === false && allDone && readStore(DAY_KEY) !== today) {
      writeStore(DAY_KEY, today);
      found.push({ kind: 'day' });
    }
    wasAllDone.current = allDone;

    if (found.length) {
      haptic([20, 60, 30]);
      for (const c of found) trackGoal(c.kind === 'day' ? 'day_complete' : 'goal_complete');
      setQueue((q) => [...q, ...found]);
    }
  }, [habits, allDone, isLoading, today]);

  const current = queue[0];
  const close = () => setQueue((q) => q.slice(1));

  return (
    <div className={'modal-overlay celebrate' + (current ? ' open' : '')} role="dialog" aria-modal="true" aria-hidden={!current}
      aria-labelledby="celebrate-title">
      {/* key: each new congratulation replays the pop-in */}
      <div className="modal-card" key={queue.length}>
        {current?.kind === 'goal' ? (
          <>
            <div className="celebrate-icon"><TrophyIcon /></div>
            <h3 id="celebrate-title">Цель достигнута!</h3>
            <p className="celebrate-goal">«{current.goalTitle}»</p>
            <p>{current.habitTitle} — {current.targetCount} раз. Поздравляю!</p>
          </>
        ) : (
          <>
            <div className="celebrate-icon"><CheckIcon /></div>
            <h3 id="celebrate-title">Ты на шаг ближе к своей цели!</h3>
            <p>Поздравляю!</p>
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="modal-btn-confirm celebrate-btn" onClick={close}>Отлично</button>
        </div>
      </div>
    </div>
  );
}
