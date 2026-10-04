import Link from 'next/link';
import type { ReactNode } from 'react';
import { AvatarButton } from './AvatarButton';
import { MenuIcon } from './icons';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Header wrapper class of the screen, e.g. "water-header", "habits-page-header" */
  className: string;
  subtitleClassName: string;
  avatarPreview?: { name: string; photo: string | null };
}

/** Screen title + subtitle with the avatar (→ Личный кабинет) and menu buttons on the right. */
export function ScreenHeader({ title, subtitle, className, subtitleClassName, avatarPreview }: Props) {
  return (
    <div className={className}>
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
      </div>
      <div className="home-header-actions">
        <AvatarButton preview={avatarPreview} />
        <Link href="/menu" className="home-menu-btn" aria-label="Меню">
          <MenuIcon />
        </Link>
      </div>
    </div>
  );
}
