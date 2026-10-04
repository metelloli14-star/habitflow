'use client';

import { useHabits, useReminders } from '@/lib/hooks';
import { BellIcon, CloseIcon } from './icons';

/** Banner at the top of the app when a habit's reminder time comes, with a quick "Отметить" action. */
export function ReminderToast() {
  const { habits, toggleHabit } = useHabits();
  const { due, dismiss } = useReminders(habits);

  const markDone = async () => {
    if (due) {
      const current = habits.find((h) => h.id === due.id);
      if (current && !current.doneToday) await toggleHabit(due.id);
    }
    dismiss();
  };

  return (
    <div className={'reminder-toast' + (due ? ' open' : '')} role="status" aria-live="polite">
      <div className="reminder-toast-icon"><BellIcon /></div>
      <div className="reminder-toast-text">
        <p className="reminder-toast-title">Пора!</p>
        <p className="reminder-toast-body">{due?.title}</p>
      </div>
      <button type="button" className="reminder-toast-done" onClick={markDone}>Отметить</button>
      <button type="button" className="reminder-toast-close" onClick={dismiss} aria-label="Закрыть"><CloseIcon /></button>
    </div>
  );
}
