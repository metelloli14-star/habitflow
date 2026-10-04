'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useSession } from '@/lib/hooks';

export function avatarStyle(photo: string | null | undefined): CSSProperties | undefined {
  return photo
    ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
}

export function initialOf(name: string | null | undefined): string {
  return (name || 'П').trim().charAt(0).toUpperCase();
}

/**
 * Round avatar in every screen header: the person's photo, or the first letter of their name.
 * `preview` lets the profile screen show unsaved changes live.
 */
export function AvatarButton({ preview }: { preview?: { name: string; photo: string | null } }) {
  const { user } = useSession();
  const name = preview?.name ?? user?.name;
  const photo = preview ? preview.photo : user?.avatar;
  return (
    <Link href="/profile" className="home-avatar-btn" aria-label="Личный кабинет" style={avatarStyle(photo)}>
      {photo ? null : initialOf(name)}
    </Link>
  );
}
