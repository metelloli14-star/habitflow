import type { Metadata, Viewport } from 'next';
import { fontVariables } from './fonts';

// Root layout: only <html>/<body> and fonts. Each route group brings its own styles:
//   (site)   — landing page and legal documents, normal scrolling web pages;
//   (mobile) — the app itself, inside the phone frame.
// Links between the two groups are plain <a> (full page load), so their global styles never mix.

export const metadata: Metadata = {
  metadataBase: new URL('https://poleznyeprivychki.ru'),
  title: { default: 'Привычка — в ритме жизни', template: '%s — Привычка' },
  description: 'Цифровой трекер привычек для осознанной жизни. Формируй полезные привычки и достигай целей каждый день.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
