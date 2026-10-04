'use client';

import { daysInMonth, formatMonthTitle, WEEKDAYS } from '@/lib/shared/dates';
import type { Frequency } from '@/lib/shared/types';

interface Props {
  frequency: Frequency;
  days: string[];
  onChange: (days: string[]) => void;
  /** Used for the month grid (current month). */
  today: string;
}

/**
 * "Дни повторения":
 * - daily: all 7 weekdays shown as selected, not clickable;
 * - weekly: pick weekdays;
 * - monthly: pick dates of the current month.
 */
export function DaysPicker({ frequency, days, onChange, today }: Props) {
  const toggle = (d: string) => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  if (frequency === 'Ежемесячно') {
    const count = daysInMonth(today);
    return (
      <div className="addhabit-field">
        <label>Дни повторения — {formatMonthTitle(today)}</label>
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
      <label>Дни повторения</label>
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
