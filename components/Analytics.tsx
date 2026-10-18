'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { analyticsConfigured, loadMetrica, readConsent, resetConsent, saveConsent, trackPageView, type Consent } from '@/lib/client/analytics';
import styles from './Analytics.module.css';

/**
 * Cookie banner + Yandex Metrica. Metrica is loaded only after "Принять"; screen changes are counted as page views.
 * Renders nothing when no counter is configured.
 */
export function Analytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | 'unknown'>('unknown');

  useEffect(() => setConsent(readConsent()), []);
  useEffect(() => {
    if (consent === 'yes') loadMetrica();
  }, [consent]);
  useEffect(() => {
    if (consent === 'yes') trackPageView(window.location.pathname + window.location.search);
  }, [pathname, consent]);

  if (!analyticsConfigured() || consent !== null) return null;

  const decide = (value: 'yes' | 'no') => {
    saveConsent(value);
    setConsent(value);
  };
  // The site and the app have their own copies of the documents.
  const policy = pathname === '/' || pathname.startsWith('/legal') ? '/legal/privacy-policy' : '/documents/privacy-policy';

  return (
    <div className={styles.banner} role="dialog" aria-label="Cookie и аналитика">
      <p className={styles.text}>
        Мы используем cookie и Яндекс Метрику, чтобы понимать, что в приложении удобно, а что нет. Без вашего согласия
        статистика не собирается. <a href={policy}>Подробнее</a>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.decline} onClick={() => decide('no')}>Отказаться</button>
        <button type="button" className={styles.accept} onClick={() => decide('yes')}>Принять</button>
      </div>
    </div>
  );
}

/** "Настройки cookie" link (site footer, app menu): asks again. */
export function CookieSettingsLink({ className }: { className?: string }) {
  if (!analyticsConfigured()) return null;
  return (
    <button type="button" className={className ?? styles.link} onClick={resetConsent}>
      Настройки cookie
    </button>
  );
}
