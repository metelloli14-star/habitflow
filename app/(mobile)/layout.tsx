import type { Viewport } from 'next';
import { PwaSetup } from '@/components/PwaSetup';
import '@/styles/app.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#dfe7ef', // status bar of the installed app: same light tone as the top of the screens
};

// The app screens live inside a phone-sized frame (full screen on phones, a device mock on desktop).
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="app">
      <div className="device">{children}</div>
      <PwaSetup />
    </div>
  );
}
