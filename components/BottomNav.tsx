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
