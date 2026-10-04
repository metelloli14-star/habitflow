'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { ReminderToast } from '@/components/ReminderToast';
import { useSession } from '@/lib/hooks';

// Everything inside (app) needs a logged-in person. If the session is missing or expired,
// the API answers 401 and we send them to the welcome screen.
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isUnauthorized } = useSession();

  useEffect(() => {
    if (isUnauthorized) router.replace('/welcome');
  }, [isUnauthorized, router]);

  return (
    <>
      {children}
      <ReminderToast />
    </>
  );
}
