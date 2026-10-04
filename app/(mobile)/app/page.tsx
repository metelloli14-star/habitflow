import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server/auth';

// Entry point from the website buttons: the app if there's a valid session, otherwise the welcome screen.
export default async function AppEntryPage() {
  const user = await getCurrentUser();
  redirect(user ? '/home' : '/welcome');
}
