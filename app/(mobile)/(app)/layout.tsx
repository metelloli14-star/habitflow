'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { preload as preloadResource } from 'react-dom';
import { BottomNav, TAB_PATHS } from '@/components/BottomNav';
import { Celebrations } from '@/components/Celebrations';
import { ReminderToast } from '@/components/ReminderToast';
import { SCREEN_BACKGROUNDS } from '@/components/ScreenBackground';
import { syncPush } from '@/lib/client/push';
import { useSession, useStats, useWater } from '@/lib/hooks';

// Everything inside (app) needs a logged-in person. If the session is missing or expired,
// the API answers 401 and we send them to the welcome screen.
//
// To feel like a native app: the bottom menu lives here (it stays in place while screens change),
// switching tabs is instant, and only screens opened "on top" (habit, profile, menu…) slide in.
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isUnauthorized } = useSession();
  // Data of the other tabs stays loaded here (like the habit list for reminders),
  // so every screen shows it on its very first frame instead of a spinner.
  useWater();
  useStats();

  // Screen backgrounds are tiny; loading them all up front means no screen ever appears without its photo.
  for (const src of SCREEN_BACKGROUNDS) preloadResource(src, { as: 'image' });

  useEffect(() => {
    if (isUnauthorized) router.replace('/welcome');
  }, [isUnauthorized, router]);

  // Keeps this device's push subscription (and time zone) up to date on the server.
  useEffect(() => {
    void syncPush();
  }, []);

  return (
    <>
      <div className="app-screens" data-transition={TAB_PATHS.includes(pathname) ? 'none' : 'push'}>
        {children}
      </div>
      <BottomNav />
      <ReminderToast />
      <Celebrations />
    </>
  );
}
