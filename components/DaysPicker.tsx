'use client';

import { daysInMonth, WEEKDAYS } from '@/lib/shared/dates';
import type { Frequency } from '@/lib/shared/types';

interface Props {
  frequency: Frequency;
  days: string[];
  onChange: (days: string[]) => void;
  /** Used for the month grid (current month). */
  today: string;
}

/**
 * Days of the habit:
 * - every day: all 7 weekdays shown as selected, not clickable;
 * - days of the week: pick weekdays (e.g. Mon, Wed, Fri);
 * - dates of the month: pick dates, repeated every month.
 */
export function DaysPicker({ frequency, days, onChange, today }: Props) {
  const toggle = (d: string) => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  if (frequency === 'Ежемесячно') {
    const count = daysInMonth(today);
    return (
      <div className="addhabit-field">
        <label>Выберите числа — повторяется каждый месяц</label>
        <div className="addhabit-days-row month-mode">
          {Array.from({ length: count }, (_, i) => String(i + 1)).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              className={'addhabit-day-chip month-chip' + (days.includes(d) ? ' active' : '')}
              onClick={() => toggle(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const daily = frequency === 'Ежедневно';
  return (
    <div className="addhabit-field">
      <label>{daily ? 'Дни повторения' : 'Выберите дни недели'}</label>
      <div className="addhabit-days-row">
        {WEEKDAYS.map((d) => {
          const active = daily || days.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={active}
              disabled={daily}
              className={'addhabit-day-chip' + (active ? ' active' : '') + (daily ? ' disabled' : '')}
              onClick={daily ? undefined : () => toggle(d)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
