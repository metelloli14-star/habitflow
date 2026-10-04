import Image from 'next/image';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

const WORKBOOK_URL = 'https://t.me/workbook_habit_bot';

export default function LandingPage() {
  return (
    <div className="page">
      <div className="grid-full" />
      <div className="bg-decor" aria-hidden="true">
        <div className="blob mint" />
        <div className="blob blue" />
        <div className="blob glow" />
        <div className="blob glow2 mobile-only" />
        <div className="blob mint2 mobile-only" />
      </div>

      <SiteHeader />

      <section className="hero">
        {/* floating cards, desktop only */}
        <div className="float-card fc-greeting desktop-only" aria-hidden="true">
          <div className="card-box">
            <div className="avatar"><Image src="/images/site/avatar-olga.png" alt="" width={52} height={52} /></div>
            <div className="txt">
              <p className="name">Привет, Ольга!</p>
              <p className="date">Четверг, 26 октября</p>
            </div>
          </div>
        </div>

        <div className="float-card fc-time desktop-only" aria-hidden="true">
          <div className="card-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            12:00, 7 Окт
          </div>
        </div>

        <div className="float-card fc-meditation desktop-only" aria-hidden="true">
          <div className="card-box">
            <div className="icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 11 13.24 11 11" /></svg>
            </div>
            <div className="txt">
              <p className="t1">Медитация осознанности</p>
              <p className="t2">Дыхательная практика • 10 мин</p>
            </div>
          </div>
        </div>

        <div className="float-card fc-water desktop-only" aria-hidden="true">
          <div className="card-box">
            <div className="txt">
              <p className="t1">Водный баланс</p>
              <p className="t2">1250 мл из 2000 мл</p>
            </div>
            <div className="pill">+250 мл</div>
          </div>
        </div>

        <div className="float-card fc-welcome desktop-only" aria-hidden="true">
          <div className="card-box">
            <div className="photo"><Image src="/images/site/welcome-olga.png" alt="" width={55} height={55} /></div>
            <div className="txt">
              <p className="t1">Привет, Ольга!</p>
              <p className="t2">Начни свой путь</p>
            </div>
          </div>
        </div>

        <h1>
          Привычки — это сила. <span className="accent">Формируем дисциплину,</span> чтобы изменить жизнь!
        </h1>
        <p className="subtitle desktop-only">Бесплатный цифровой трекер привычек для осознанной жизни. Формируй полезные привычки и достигай целей каждый день.</p>
        <p className="subtitle mobile-only">Цифровой трекер привычек для осознанной жизни. Формируй полезные привычки и достигай целей каждый день.</p>

        <div className="cta-row">
          <a href={WORKBOOK_URL} target="_blank" rel="noopener" className="btn secondary">Рабочая тетрадь</a>
          <a href="/app" className="btn primary">Приложение →</a>
        </div>

        {/* phone mockup, mobile only */}
        <div className="phone-mockup mobile-only">
          <Image src="/images/site/phone-mockup.png" alt="Экран приложения Привычка" width={441} height={753} priority />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
