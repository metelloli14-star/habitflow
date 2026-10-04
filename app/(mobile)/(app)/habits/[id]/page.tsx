'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { formToHabitInput, HabitForm, habitToForm, type HabitFormValue } from '@/components/HabitForm';
import { ConfirmModal } from '@/components/Modals';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { useHabit, useToday } from '@/lib/hooks';

// Changes are saved automatically: choices right away, text fields when they lose focus.
export default function EditHabitPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const today = useToday();
  const { habit, isLoading, error, updateHabit, deleteHabit } = useHabit(id);
  const [form, setForm] = useState<HabitFormValue | null>(null);
  const [saveError, setSaveError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<HabitFormValue | null>(null);

  useEffect(() => {
    if (habit && !formRef.current) {
      const initial = habitToForm(habit);
      formRef.current = initial;
      setForm(initial);
    }
  }, [habit]);

  const save = async (value: HabitFormValue) => {
    if (!value.title.trim()) return; // keep the last saved title until a new one is typed
    setSaveError('');
    try {
      await updateHabit(formToHabitInput(value));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить изменения');
    }
  };

  const onChange = (next: HabitFormValue, commit: boolean) => {
    formRef.current = next;
    setForm(next);
    if (commit) void save(next);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteHabit();
      router.replace('/habits');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не удалось удалить привычку');
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const total = habit?.goal?.targetCount ?? 0;
  const done = habit ? Math.min(habit.progressDone, total || habit.progressDone) : 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section id="screen-edit-habit" className="screen active">
      <ScreenBackground className="edithabit-bg-photo" src="/images/edit-habit-bg.jpg" />
      <div className="edithabit-scroll">
        <StatusBar />
        <ScreenHeader className="edithabit-page-header" subtitleClassName="edithabit-subtitle" title="Редактирование" subtitle={form?.title || habit?.title || '\u00a0'} />

        {error ? (
          <div className="habits-empty-list-note">
            Привычка не найдена. <Link href="/habits">Вернуться к списку</Link>
          </div>
        ) : isLoading || !form || !today ? (
          <div className="screen-loading">Загрузка…</div>
        ) : (
          <>
            <HabitForm value={form} today={today} onChange={onChange} onTextCommit={() => formRef.current && save(formRef.current)} />
            {saveError && <p className="form-error" role="alert" style={{ marginBottom: 12 }}>{saveError}</p>}

            <div className="edithabit-progress-card">
              <h3>Прогресс</h3>
              {habit?.goal ? (
                <>
                  <p className="edithabit-progress-text">{done} из {total} выполнено</p>
                  <div className="edithabit-progress-track">
                    <div className="edithabit-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </>
              ) : (
                <p className="edithabit-progress-text">
                  Выполнено {habit?.progressDone ?? 0} раз. Добавьте цель, чтобы видеть прогресс к ней.
                </p>
              )}
            </div>

            <Link href="/stats" className="edithabit-stats-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Перейти в статистику
            </Link>
            <button className="edithabit-delete-btn" onClick={() => setConfirmOpen(true)}>Удалить привычку</button>
          </>
        )}
      </div>
      <BottomNav />
      <ConfirmModal
        open={confirmOpen}
        title="Удалить привычку?"
        text={`«${habit?.title ?? ''}» и прогресс её цели будут удалены безвозвратно.`}
        confirmLabel="Удалить"
        busy={deleting}
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      />
    </section>
  );
}
