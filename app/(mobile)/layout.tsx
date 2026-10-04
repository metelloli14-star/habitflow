import type { Viewport } from 'next';
import '@/styles/app.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a2b38',
};

// The app screens live inside a phone-sized frame (full screen on phones, a device mock on desktop).
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="app">
      <div className="device">{children}</div>
    </div>
  );
}
