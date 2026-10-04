'use client';

import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { PillGroup } from '@/components/PillGroup';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { BottleIcon, CloseIcon, GlassIcon, PencilIcon } from '@/components/icons';
import { useWater } from '@/lib/hooks';
import { WATER_GOAL_OPTIONS } from '@/lib/shared/constants';

const RING_CIRCUMFERENCE = 596.9; // 2π · r(95)

export default function WaterPage() {
  const { day, isLoading, addWater, removeEntry, setGoal } = useWater();
  const [pickerOpen, setPickerOpen] = useState(false);

  const goal = day?.goal ?? 2000;
  const amount = day?.amount ?? 0;
  const pct = Math.floor((amount / goal) * 100);
  const ringPct = Math.min(100, pct);

  const chooseGoal = async (value: string) => {
    setPickerOpen(false);
    await setGoal(Number(value));
  };

  return (
    <section id="screen-water" className="screen active">
      <ScreenBackground className="water-bg-photo" src="/images/water-bg.jpg" />
      <div className="water-scroll">
        <StatusBar />
        <ScreenHeader className="water-header" subtitleClassName="water-subtitle" title="Водный баланс" subtitle="Мониторинг за сегодня" />

        <div className="water-summary-card">
          <div className="water-ring">
            <svg viewBox="0 0 230 230">
              <defs>
                <linearGradient id="waterRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b7d0e2" />
                  <stop offset="55%" stopColor="#6caca5" />
                  <stop offset="100%" stopColor="#4f8f88" />
                </linearGradient>
                <linearGradient id="waterRingShine" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <filter id="waterRingShadow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#4f8f88" floodOpacity="0.4" />
                </filter>
              </defs>
              <circle className="ring-bg" cx="115" cy="115" r="95" />
              <circle className="ring-fg" cx="115" cy="115" r="95" strokeDasharray={RING_CIRCUMFERENCE}
                style={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - ringPct / 100) }} />
              <circle className="ring-shine" cx="115" cy="115" r="95" strokeDasharray={`90 ${RING_CIRCUMFERENCE}`} strokeDashoffset="0" />
            </svg>
            <div className="water-ring-label">
              <p className="water-amount-big">{(amount / 1000).toFixed(2)} л</p>
              <p className="water-percent-text">{pct}% Выполнено</p>
            </div>
          </div>

          <p className="water-goal-text" style={{ cursor: 'pointer' }} onClick={() => setPickerOpen((o) => !o)}>
            Цель: <span>{(goal / 1000).toFixed(1)} литра</span>
            <button type="button" className="water-goal-edit-btn" aria-label="Изменить цель" aria-expanded={pickerOpen}
              onClick={(e) => { e.stopPropagation(); setPickerOpen((o) => !o); }}>
              <PencilIcon />
            </button>
          </p>

          <div className={'water-goal-picker' + (pickerOpen ? ' open' : '')}>
            <p className="water-goal-picker-label">Дневная цель</p>
            <PillGroup
              ariaLabel="Дневная цель"
              className="water-goal-pill-row"
              pillClassName="water-goal-pill"
              options={WATER_GOAL_OPTIONS.map((ml) => ({ value: String(ml), label: `${ml / 1000} л` }))}
              value={String(goal)}
              onChange={chooseGoal}
            />
          </div>

          <div className="water-quick-actions">
            <button className="water-quick-btn secondary" onClick={() => addWater(250)}><GlassIcon />+250 мл</button>
            <button className="water-quick-btn primary" onClick={() => addWater(500)}><BottleIcon />+500 мл</button>
          </div>
        </div>

        <h2 className="water-history-title">История приёмов</h2>
        <div className="water-history-list">
          {isLoading ? (
            <div className="screen-loading">Загрузка…</div>
          ) : !day || day.entries.length === 0 ? (
            <div className="water-history-empty">Записей пока нет</div>
          ) : (
            [...day.entries].reverse().map((e) => (
              <div key={e.id} className="water-history-item">
                <span className="hist-time">{e.time}</span>
                <span className="hist-label">Выпито {e.amount} мл</span>
                <span className="hist-total">{e.total} мл</span>
                <button type="button" className="hist-remove-btn" aria-label="Удалить запись"
                  disabled={e.id.startsWith('pending-')} onClick={() => removeEntry(e.id)}>
                  <CloseIcon />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </section>
  );
}
