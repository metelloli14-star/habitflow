'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { PillGroup } from '@/components/PillGroup';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { PencilIcon, PlusIcon } from '@/components/icons';
import { useHabits } from '@/lib/hooks';
import { CATEGORIES } from '@/lib/shared/constants';
import type { Category } from '@/lib/shared/types';

type Filter = 'all' | Category;
const FILTERS: { value: Filter; label: string }[] = [{ value: 'all', label: 'Все' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];

export default function HabitsPage() {
  const { habits, isLoading } = useHabits();
  const [filter, setFilter] = useState<Filter>('all');
  const shown = filter === 'all' ? habits : habits.filter((h) => h.category === filter);

  return (
    <section id="screen-habits" className="screen active">
      <ScreenBackground className="habits-bg-photo" src="/images/habits-bg.jpg" />
      <div className="habits-scroll">
        <StatusBar />
        <ScreenHeader className="habits-page-header" subtitleClassName="habits-subtitle" title="Мои привычки" subtitle="Управление и серии" />

        <PillGroup ariaLabel="Категория" className="habits-filter-row" pillClassName="habits-filter-pill"
          options={FILTERS} value={filter} onChange={setFilter} />

        <div className="habits-list">
          {isLoading ? (
            <div className="screen-loading">Загрузка…</div>
          ) : shown.length === 0 ? (
            <div className="habits-empty-list-note">
              {filter === 'all'
                ? 'У вас пока нет привычек. Нажмите «Добавить новую привычку», чтобы создать первую.'
                : 'В этой категории пока нет привычек'}
            </div>
          ) : (
            shown.map((h) => (
              <div key={h.id} className="habit-row-card">
                <div className="habit-row-info">
                  <h3>{h.title}</h3>
                  <p>{h.category} • {h.frequency}{h.streak > 1 ? ` • серия ${h.streak}` : ''}</p>
                </div>
                <Link href={`/habits/${h.id}`} className="habit-edit-btn" aria-label={`Редактировать «${h.title}»`}>
                  <PencilIcon />
                </Link>
              </div>
            ))
          )}
        </div>

        <Link href="/habits/new" className="habits-add-btn" style={{ textDecoration: 'none' }}>
          <PlusIcon />
          Добавить новую привычку
        </Link>
      </div>
      <BottomNav />
    </section>
  );
}
