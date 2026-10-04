'use client';

import { CATEGORIES, DEFAULT_GOAL_COUNT, FREQUENCIES } from '@/lib/shared/constants';
import { isValidDateStr } from '@/lib/shared/dates';
import type { Category, Frequency, HabitDTO, HabitInput } from '@/lib/shared/types';
import { requestReminderPermission } from '@/lib/hooks';
import { DaysPicker } from './DaysPicker';
import { PillGroup } from './PillGroup';

export interface HabitFormValue {
  title: string;
  category: Category;
  frequency: Frequency;
  days: string[];
  reminderTime: string;
  goalOpen: boolean;
  goalTitle: string;
  goalDescription: string;
  goalCount: string;
  goalDeadline: string;
}

export const EMPTY_HABIT_FORM: HabitFormValue = {
  title: '', category: 'Здоровье', frequency: 'Ежедневно', days: [], reminderTime: '',
  goalOpen: false, goalTitle: '', goalDescription: '', goalCount: '', goalDeadline: '',
};

export function habitToForm(h: HabitDTO): HabitFormValue {
  return {
    title: h.title, category: h.category, frequency: h.frequency, days: h.days, reminderTime: h.reminderTime,
    goalOpen: !!h.goal,
    goalTitle: h.goal?.title ?? '',
    goalDescription: h.goal?.description ?? '',
    goalCount: h.goal ? String(h.goal.targetCount) : '',
    goalDeadline: h.goal?.deadline ?? '',
  };
}

/** A goal is saved only when it has a name and a deadline; clearing the name removes the goal. */
export function formToHabitInput(v: HabitFormValue): HabitInput {
  const count = parseInt(v.goalCount, 10);
  const hasGoal = v.goalTitle.trim() !== '' && isValidDateStr(v.goalDeadline);
  return {
    title: v.title.trim(),
    category: v.category,
    frequency: v.frequency,
    days: v.frequency === 'Ежедневно' ? [] : v.days,
    reminderTime: v.reminderTime,
    goal: hasGoal
      ? {
          title: v.goalTitle.trim(),
          description: v.goalDescription.trim(),
          targetCount: count >= 1 && count <= 999 ? count : DEFAULT_GOAL_COUNT,
          deadline: v.goalDeadline,
        }
      : null,
  };
}

interface Props {
  value: HabitFormValue;
  today: string;
  titleError?: boolean;
  /** `commit` is true for choices that should be saved right away (pills, days, time, date). */
  onChange: (next: HabitFormValue, commit: boolean) => void;
  /** Called when a text field loses focus (the edit screen saves then). */
  onTextCommit?: () => void;
}

export function HabitForm({ value, today, titleError, onChange, onTextCommit }: Props) {
  const set = <K extends keyof HabitFormValue>(key: K, v: HabitFormValue[K], commit: boolean) =>
    onChange({ ...value, [key]: v }, commit);

  return (
    <>
      <div className="addhabit-field">
        <label htmlFor="habit-title">Название привычки</label>
        <input
          id="habit-title"
          className={'addhabit-input' + (titleError ? ' input-error' : '')}
          type="text"
          maxLength={80}
          placeholder={titleError ? 'Введите название привычки' : 'Например, Пробежка 3 км'}
          value={value.title}
          onChange={(e) => set('title', e.target.value, false)}
          onBlur={onTextCommit}
        />
      </div>

      <div className="addhabit-field">
        <label>Категория</label>
        <PillGroup
          ariaLabel="Категория"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={value.category}
          onChange={(c) => set('category', c, true)}
        />
      </div>

      <div className="addhabit-field">
        <label>Частота повторений</label>
        <PillGroup
          ariaLabel="Частота повторений"
          options={FREQUENCIES}
          value={value.frequency}
          onChange={(f) => onChange({ ...value, frequency: f, days: [] }, true)}
        />
      </div>

      <DaysPicker frequency={value.frequency} days={value.days} today={today} onChange={(d) => set('days', d, true)} />

      <div className="addhabit-field">
        <label htmlFor="habit-time">Время напоминания</label>
        <input
          id="habit-time"
          className="addhabit-input"
          type="time"
          value={value.reminderTime}
          onChange={(e) => {
            if (e.target.value) requestReminderPermission();
            set('reminderTime', e.target.value, true);
          }}
        />
      </div>

      <div className="addhabit-field">
        <label>Цель</label>
        <button type="button" className="addhabit-goal-toggle-btn" onClick={() => set('goalOpen', !value.goalOpen, false)}>
          {value.goalOpen ? '− Скрыть цель' : value.goalTitle ? '+ Показать цель' : '+ Создать цель'}
        </button>
      </div>

      {value.goalOpen && (
        <div className="addhabit-goal-fields">
          <div className="addhabit-field">
            <label htmlFor="goal-title">Название цели</label>
            <input id="goal-title" className="addhabit-input" type="text" maxLength={80} placeholder="Например, Пробежать полумарафон"
              value={value.goalTitle} onChange={(e) => set('goalTitle', e.target.value, false)} onBlur={onTextCommit} />
          </div>
          <div className="addhabit-field">
            <label htmlFor="goal-description">Описание</label>
            <input id="goal-description" className="addhabit-input" type="text" maxLength={120} placeholder="Например, бегать по утрам без пропусков"
              value={value.goalDescription} onChange={(e) => set('goalDescription', e.target.value, false)} onBlur={onTextCommit} />
          </div>
          <div className="addhabit-field">
            <label htmlFor="goal-count">Сколько раз выполнить</label>
            <input id="goal-count" className="addhabit-input" type="number" inputMode="numeric" min={1} max={999} placeholder="Например, 30"
              value={value.goalCount} onChange={(e) => set('goalCount', e.target.value, false)} onBlur={onTextCommit} />
          </div>
          <div className="addhabit-field">
            <label htmlFor="goal-deadline">Срок достижения</label>
            <input id="goal-deadline" className="addhabit-input" type="date" min={today}
              value={value.goalDeadline} onChange={(e) => set('goalDeadline', e.target.value, true)} />
          </div>
        </div>
      )}
    </>
  );
}
