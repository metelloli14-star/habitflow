'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { StatusBar } from '@/components/StatusBar';
import { ChartIcon, ChevronRightIcon, CloseIcon, TrendIcon } from '@/components/icons';

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

        <Link href="/stats" className="menu-item-row" style={{ color: 'inherit' }}>
          <div className="menu-item-icon"><ChartIcon /></div>
          <div className="menu-item-info">
            <h3>Статистика</h3>
            <p>Результат</p>
          </div>
          <ChevronRightIcon className="menu-item-chevron" />
        </Link>

        <div className="menu-brand">
          <div className="menu-brand-row">
            <div className="menu-brand-icon"><TrendIcon /></div>
            <div className="menu-brand-text">
              <div className="menu-brand-title">ПРИВЫЧКА</div>
              <div className="menu-brand-tagline">В РИТМЕ ЖИЗНИ</div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </section>
  );
}
