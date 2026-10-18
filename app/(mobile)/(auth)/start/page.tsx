import Image from 'next/image';
import Link from 'next/link';
import { StatusBar } from '@/components/StatusBar';

// Shown once, right after the email is confirmed. "Начать" leads to the guide on installing the app
// (it sends people straight to the app when they're already in the installed one).
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
        <Link href="/install" className="glass-btn">Начать</Link>
      </div>
    </section>
  );
}
