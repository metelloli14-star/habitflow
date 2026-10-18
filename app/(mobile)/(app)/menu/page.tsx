'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CookieSettingsLink } from '@/components/Analytics';
import { StatusBar } from '@/components/StatusBar';
import { ChartIcon, ChevronRightIcon, CloseIcon, ListIcon, TrendIcon, TrophyIcon, UserIcon } from '@/components/icons';

const ITEMS = [
  { href: '/profile', title: 'Личный кабинет', note: 'Профиль, уведомления, вход', Icon: UserIcon },
  { href: '/habits', title: 'Мои привычки', note: 'Список, серии, изменение', Icon: ListIcon },
  { href: '/goals', title: 'Цели', note: 'Прогресс по целям', Icon: TrophyIcon },
  { href: '/stats', title: 'Статистика', note: 'Результат за неделю и месяц', Icon: ChartIcon },
];

export default function MenuPage() {
  const router = useRouter();
  const close = () => (window.history.length > 1 ? router.back() : router.push('/home'));

  return (
    <section id="screen-menu" className="screen active">
      <div className="menu-scroll">
        <StatusBar />
        <div className="menu-page-header">
          <h1>Меню</h1>
          <button className="menu-close-btn" onClick={close} aria-label="Закрыть меню"><CloseIcon /></button>
        </div>

        {ITEMS.map(({ href, title, note, Icon }) => (
          <Link key={href} href={href} className="menu-item-row" style={{ color: 'inherit' }}>
            <div className="menu-item-icon"><Icon /></div>
            <div className="menu-item-info">
              <h3>{title}</h3>
              <p>{note}</p>
            </div>
            <ChevronRightIcon className="menu-item-chevron" />
          </Link>
        ))}

        <div className="menu-brand">
          <div className="menu-brand-row">
            <div className="menu-brand-icon"><TrendIcon /></div>
            <div className="menu-brand-text">
              <div className="menu-brand-title">ПРИВЫЧКА</div>
              <div className="menu-brand-tagline">В РИТМЕ ЖИЗНИ</div>
            </div>
          </div>
          <CookieSettingsLink className="menu-cookie-link" />
        </div>
      </div>
    </section>
  );
}
