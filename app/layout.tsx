import type { Metadata, Viewport } from 'next';
import { Analytics } from '@/components/Analytics';
import { fontVariables } from './fonts';

// Root layout: only <html>/<body> and fonts. Each route group brings its own styles:
//   (site)   — landing page and legal documents, normal scrolling web pages;
//   (mobile) — the app itself, inside the phone frame.
// Links between the two groups are plain <a> (full page load), so their global styles never mix.

export const metadata: Metadata = {
  metadataBase: new URL('https://poleznyeprivychki.ru'),
  title: { default: 'Привычка — в ритме жизни', template: '%s — Привычка' },
  description: 'Цифровой трекер привычек для осознанной жизни. Формируй полезные привычки и достигай целей каждый день.',
  // Link preview in Telegram, WhatsApp, VK…: the image is app/opengraph-image.jpg (the landing hero from the Figma design).
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Привычка',
    url: '/',
    title: 'Привычка — в ритме жизни',
    description: 'Бесплатный трекер привычек, воды и целей с напоминаниями. Формируй полезные привычки и достигай целей каждый день.',
  },
  twitter: { card: 'summary_large_image' },
  // Favicons from the Figma design; /favicon.ico comes from app/favicon.ico (16/32/48 px).
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  // Installed on the iPhone home screen, the app opens full screen (and can receive push notifications).
  appleWebApp: { capable: true, title: 'Привычка', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVariables}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
