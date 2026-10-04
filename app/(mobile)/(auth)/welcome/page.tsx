import Image from 'next/image';
import Link from 'next/link';
import { StatusBar } from '@/components/StatusBar';

export default function WelcomePage() {
  return (
    <section id="screen-welcome" className="screen active">
      <div className="welcome-photo">
        <Image src="/images/welcome-bg.jpg" alt="" fill priority sizes="440px" />
      </div>
      <div className="welcome-blob b1" />
      <div className="welcome-blob b2" />
      <StatusBar />
      <div className="welcome-content">
        <h1>Добро<br />пожаловать</h1>
        <p className="sub">Я помогу тебе стать лучше для себя</p>
        <Link href="/login" className="glass-btn">Войти</Link>
        <Link href="/register" className="glass-btn secondary">Создать аккаунт</Link>
      </div>
    </section>
  );
}
