'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DropIcon, HomeIcon, ListIcon, TrophyIcon } from './icons';

const ITEMS = [
  { href: '/home', label: 'ГЛАВНАЯ', Icon: HomeIcon },
  { href: '/water', label: 'ВОДА', Icon: DropIcon },
  { href: '/habits', label: 'ПРИВЫЧКИ', Icon: ListIcon },
  { href: '/goals', label: 'ЦЕЛИ', Icon: TrophyIcon },
];

/** The four tabs: switching between them is instant, like in a native app. */
export const TAB_PATHS = ITEMS.map((i) => i.href);

/** Rendered once by the app layout, so it stays in place while screens change. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="home-bottom-nav" aria-label="Основные разделы">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href} className={'home-nav-item' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined}>
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
