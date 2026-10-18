'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { installWay, onInstallChange, promptInstall, type InstallWay } from '@/lib/client/install';
import { CloseIcon } from './icons';

const DISMISSED_KEY = 'habitflow_install_dismissed';
const HIDE_FOR_MS = 14 * 24 * 60 * 60 * 1000;

function dismissedRecently(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_KEY) || 0) < HIDE_FOR_MS;
  } catch {
    return false;
  }
}

/** iOS "Share" icon, so the instruction matches what the person sees in Safari. */
const ShareIcon = () => (
  <svg className="install-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="«Поделиться»">
    <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);

/** Card on the home screen: install the app to use it without the browser's address bar. Hidden once installed. */
export function InstallBanner() {
  const [way, setWay] = useState<InstallWay>(null);

  useEffect(() => {
    const update = () => setWay(dismissedRecently() ? null : installWay());
    update();
    return onInstallChange(update);
  }, []);

  if (!way) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
    setWay(null);
  };

  return (
    <div className="install-card" role="region" aria-label="Установка приложения">
      <div className="install-card-text">
        <p className="install-card-title">Установите «Привычку»</p>
        {way === 'prompt' ? (
          <p>Приложение откроется без строки браузера, с иконкой на экране телефона.</p>
        ) : (
          <p>Нажмите <ShareIcon /> внизу Safari → «На экран „Домой“». Приложение откроется без строки браузера, и заработают уведомления.{' '}
            <Link href="/install" className="install-card-link">Как установить</Link></p>
        )}
      </div>
      {way === 'prompt' && (
        <button type="button" className="push-btn" onClick={() => void promptInstall()}>Установить</button>
      )}
      <button type="button" className="install-card-close" onClick={dismiss} aria-label="Скрыть"><CloseIcon /></button>
    </div>
  );
}
