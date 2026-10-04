import Image from 'next/image';
import Link from 'next/link';
import { StatusBar } from '@/components/StatusBar';

// Shown once, right after the email is confirmed.
export default function StartPage() {
  return (
    <section id="screen-start" className="screen active">
      <div className="welcome-photo">
        <Image src="/images/start-bg.jpg" alt="" fill priority sizes="440px" />
      </div>
      <div className="welcome-blob b1" />
      <div className="welcome-blob b2" />
      <StatusBar />
      <div className="welcome-content start-content">
        <h1>Начни<br />менять свою<br />жизнь!</h1>
        <p className="sub">Твой путь к лучшим привычкам<br />начинается здесь</p>
        <Link href="/home" className="glass-btn">Начать</Link>
      </div>
    </section>
  );
}
