'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { EMPTY_HABIT_FORM, formToHabitInput, HabitForm, type HabitFormValue } from '@/components/HabitForm';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { useHabits } from '@/lib/hooks';
import { isValidDateStr } from '@/lib/shared/dates';

export default function NewHabitPage() {
  const router = useRouter();
  const { createHabit, today } = useHabits();
  const [form, setForm] = useState<HabitFormValue>(EMPTY_HABIT_FORM);
  const [titleError, setTitleError] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!form.title.trim()) {
      setTitleError(true);
      document.getElementById('habit-title')?.focus();
      return;
    }
    if (form.goalTitle.trim() && !isValidDateStr(form.goalDeadline)) {
      setError('Укажите срок достижения цели или очистите её название');
      return;
    }
    setBusy(true);
    try {
      await createHabit(formToHabitInput(form));
      router.push('/habits');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать привычку');
      setBusy(false);
    }
  };

  return (
    <section id="screen-add-habit" className="screen active">
      <ScreenBackground className="addhabit-bg-photo" src="/images/add-habit-bg.jpg" />
      <div className="addhabit-scroll">
        <StatusBar />
        <ScreenHeader className="addhabit-page-header" subtitleClassName="addhabit-subtitle" title="Новая привычка" subtitle="Создание новой привычки" />
        {today && (
          <HabitForm
            value={form}
            today={today}
            titleError={titleError}
            onChange={(next) => {
              if (next.title.trim()) setTitleError(false);
              setForm(next);
            }}
          />
        )}
        {error && <p className="form-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
        <button className={'addhabit-submit-btn' + (busy ? ' is-busy' : '')} onClick={submit} disabled={busy}>
          {busy ? 'Создаём…' : 'Создать привычку'}
        </button>
      </div>
      <BottomNav />
    </section>
  );
}
