// Web analytics: Yandex Metrica, loaded only after the person accepts it in the cookie banner.
// The counter id comes from NEXT_PUBLIC_YANDEX_METRIKA_ID (set before `npm run build`); without it nothing is loaded.
// Session recording (Webvisor) stays off: no typed data or screen content goes to Metrica.
//
// Funnel goals (set them up in Metrica as "JavaScript event" goals with these ids):
//   register → email_confirmed → install_guide_done / app_installed → habit_created → habit_marked → push_enabled,
//   plus login, water_added, day_complete, goal_complete.

const COUNTER_ID = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID) || null;
const CONSENT_KEY = 'habitflow_analytics';

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global {
  interface Window {
    ym?: Ym;
  }
}

export type Consent = 'yes' | 'no' | null;

export const analyticsConfigured = () => COUNTER_ID !== null;

export function readConsent(): Consent {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'yes' || value === 'no' ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: 'yes' | 'no') {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage unavailable: the banner will ask again next time */
  }
}

/** "Настройки cookie": forget the decision and reload, so the banner asks again (and an accepted Metrica is unloaded). */
export function resetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* nothing to reset */
  }
  window.location.reload();
}

/** Loads the Metrica tag (official snippet, rewritten). Page views are sent by hand on every screen change. */
export function loadMetrica() {
  if (!COUNTER_ID || window.ym) return;
  const ym: Ym = (...args: unknown[]) => {
    (ym.a = ym.a || []).push(args);
  };
  ym.l = Date.now();
  window.ym = ym;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(script);
  ym(COUNTER_ID, 'init', { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
}

export function trackPageView(url: string) {
  if (COUNTER_ID && window.ym) window.ym(COUNTER_ID, 'hit', url, { title: document.title });
}

/** A funnel step (no-op until the person has accepted analytics). */
export function trackGoal(goal: string, params?: Record<string, string | number>) {
  if (COUNTER_ID && typeof window !== 'undefined' && window.ym) window.ym(COUNTER_ID, 'reachGoal', goal, params);
}
