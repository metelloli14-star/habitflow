'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { PillGroup } from '@/components/PillGroup';
import { StatusBar } from '@/components/StatusBar';
import { trackGoal } from '@/lib/client/analytics';
import { installWay, onInstallChange, promptInstall } from '@/lib/client/install';
import { isStandalone } from '@/lib/client/push';

type Platform = 'ios' | 'android';

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'ios', label: 'iPhone' },
  { value: 'android', label: 'Android' },
];

const APP_ICON = '/icons/icon-192.png';

// ---- Small drawn mock-ups of what the person sees on the phone; the button to press is highlighted ----

const ShareGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);
const AddSquareGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
);
const DotsGlyph = ({ vertical = false }: { vertical?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    {(vertical ? [[12, 5], [12, 12], [12, 19]] : [[5, 12], [12, 12], [19, 12]]).map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" />)}
  </svg>
);

function SafariBar() {
  return (
    <div className="mock mock-bar">
      <span className="mock-muted">‹</span>
      <span className="mock-url">poleznyeprivychki.ru</span>
      <span className="mock-hit"><ShareGlyph /></span>
      <span className="mock-muted mock-glyph"><DotsGlyph /></span>
    </div>
  );
}

function MenuList({ rows, hit }: { rows: string[]; hit: { label: string; icon: ReactNode } }) {
  return (
    <div className="mock mock-list">
      {rows.map((r) => <div key={r} className="mock-row">{r}</div>)}
      <div className="mock-row mock-hit-row">{hit.label}<span className="mock-glyph">{hit.icon}</span></div>
    </div>
  );
}

function AddDialog({ ios }: { ios: boolean }) {
  return ios ? (
    <div className="mock mock-dialog">
      <div className="mock-dialog-head">
        <span className="mock-muted">Отменить</span><b>На экран «Домой»</b><span className="mock-hit-text">Добавить</span>
      </div>
      <div className="mock-app"><Image src={APP_ICON} alt="" width={44} height={44} unoptimized /><span>Привычка</span></div>
    </div>
  ) : (
    <div className="mock mock-dialog">
      <b>Установить приложение?</b>
      <div className="mock-app"><Image src={APP_ICON} alt="" width={44} height={44} unoptimized /><span>Привычка</span></div>
      <div className="mock-dialog-actions"><span className="mock-muted">Отмена</span><span className="mock-hit-text">Установить</span></div>
    </div>
  );
}

function HomeScreen() {
  return (
    <div className="mock mock-home">
      {[0, 1, 2].map((i) => <span key={i} className="mock-home-app" />)}
      <span className="mock-home-app ours"><Image src={APP_ICON} alt="" width={44} height={44} unoptimized /><i>Привычка</i></span>
    </div>
  );
}

interface Step { title: string; text: ReactNode; mock: ReactNode }

const STEPS: Record<Platform, Step[]> = {
  ios: [
    {
      title: 'Откройте сайт в Safari и нажмите «Поделиться»',
      text: <>Кнопка — квадрат со стрелкой вверх внизу экрана. Если её не видно, сначала нажмите «•••».</>,
      mock: <SafariBar />,
    },
    {
      title: 'Выберите «На экран „Домой“»',
      text: <>Пролистайте список вниз. Если пункта нет — нажмите «Ещё» или «Изменить действия».</>,
      mock: <MenuList rows={['Скопировать', 'Добавить в избранное']} hit={{ label: 'На экран «Домой»', icon: <AddSquareGlyph /> }} />,
    },
    {
      title: 'Нажмите «Добавить»',
      text: <>Если есть переключатель «Открывать как веб-приложение», оставьте его включённым.</>,
      mock: <AddDialog ios />,
    },
    {
      title: 'Откройте «Привычку» с экрана «Домой»',
      text: <>Приложение откроется без строки браузера. Войдите и включите уведомления в личном кабинете.</>,
      mock: <HomeScreen />,
    },
  ],
  android: [
    {
      title: 'Откройте меню браузера',
      text: <>В Chrome или Яндекс Браузере — кнопка «⋮» в углу экрана.</>,
      mock: (
        <div className="mock mock-bar">
          <span className="mock-url">poleznyeprivychki.ru</span>
          <span className="mock-hit"><DotsGlyph vertical /></span>
        </div>
      ),
    },
    {
      title: 'Выберите «Установить приложение»',
      text: <>Пункт может называться «Добавить на главный экран».</>,
      mock: <MenuList rows={['Новая вкладка', 'Закладки']} hit={{ label: 'Установить приложение', icon: <AddSquareGlyph /> }} />,
    },
    {
      title: 'Подтвердите «Установить»',
      text: <>Иконка «Привычки» появится на рабочем столе.</>,
      mock: <AddDialog ios={false} />,
    },
    {
      title: 'Откройте «Привычку» с рабочего стола',
      text: <>Приложение откроется без строки браузера, а напоминания будут приходить, даже когда оно закрыто.</>,
      mock: <HomeScreen />,
    },
  ],
};

const detectPlatform = (): Platform =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'android';

/** Shown once after registration: how to put the app on the home screen. Skipped inside the installed app. */
export default function InstallGuidePage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>('ios');
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      router.replace('/home');
      return;
    }
    setPlatform(detectPlatform());
    const update = () => setCanPrompt(installWay() === 'prompt');
    update();
    return onInstallChange(update);
  }, [router]);

  const install = async () => {
    if (await promptInstall()) router.replace('/home');
  };

  return (
    <section id="screen-install" className="screen active">
      <div className="install-scroll">
        <StatusBar />
        <h1>Установите «Привычку» на телефон</h1>
        <p className="install-lead">
          Так приложение откроется с экрана «Домой» — без строки браузера, как обычное.
          А напоминания о привычках будут приходить, даже когда оно закрыто.
        </p>

        <PillGroup ariaLabel="Телефон" options={PLATFORMS} value={platform} onChange={setPlatform}
          className="install-platforms" pillClassName="install-platform" />

        {platform === 'android' && canPrompt && (
          <button type="button" className="install-now-btn" onClick={() => void install()}>Установить сейчас</button>
        )}

        <ol className="install-steps">
          {STEPS[platform].map((step, i) => (
            <li key={step.title} className="install-step">
              <span className="install-step-num">{i + 1}</span>
              <div className="install-step-body">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {step.mock}
              </div>
            </li>
          ))}
        </ol>

        <button type="button" className="install-done-btn" onClick={() => {
          trackGoal('install_guide_done', { platform });
          router.replace('/home');
        }}>Спасибо, я понял</button>
      </div>
    </section>
  );
}
