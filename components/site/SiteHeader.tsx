import Link from 'next/link';
import { BrandIcon, BrandName } from './Brand';

export function SiteHeader() {
  return (
    <header>
      <Link href="/" className="brand" aria-label="Привычка — на главную">
        <BrandIcon />
        <BrandName />
      </Link>
      {/* Plain <a>: the app is a different route group with its own styles, so it gets a full page load. */}
      <a href="/app" className="download-btn desktop-only">Открыть приложение ↗</a>
    </header>
  );
}
