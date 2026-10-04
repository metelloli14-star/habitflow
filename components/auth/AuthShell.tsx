import Link from 'next/link';
import type { ReactNode } from 'react';
import { StatusBar } from '../StatusBar';
import { BackIcon } from '../icons';

interface Props {
  id: string;
  title: string;
  subtitle: string;
  backHref: string;
  children: ReactNode;
}

/** Shared frame of the login / registration / confirmation screens: foggy photo, glow, back button, title. */
export function AuthShell({ id, title, subtitle, backHref, children }: Props) {
  return (
    <section id={id} className="screen auth-screen active">
      <div className="auth-bg-photo" />
      <div className="auth-haze-top" />
      <div className="auth-haze-bottom" />
      <div className="auth-orb o1" />
      <div className="auth-orb o2" />
      <div className="auth-orb o3" />
      <Link href={backHref} className="back-btn" aria-label="Назад">
        <BackIcon width={16} height={16} />
      </Link>
      <div className="auth-main">
        <StatusBar />
        <div className="auth-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="auth-content">{children}</div>
      </div>
    </section>
  );
}
