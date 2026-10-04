import Link from 'next/link';
import { OPERATOR } from '@/lib/shared/legal';
import { BrandIcon, BrandName } from './Brand';

export function SiteFooter({ currentDoc }: { currentDoc?: string }) {
  const link = (slug: string, label: string) => (
    <Link href={`/legal/${slug}`} aria-current={currentDoc === slug ? 'page' : undefined}>{label}</Link>
  );
  return (
    <footer id="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <BrandIcon style={{ width: 34, height: 34 }} />
            <BrandName />
          </div>
          <div className="footer-links">
            {link('privacy-policy', 'Политика конфиденциальности')}
            {link('personal-data', 'Согласие на обработку персональных данных')}
            {link('terms', 'Пользовательское соглашение')}
          </div>
        </div>
        <div className="footer-divider mobile-only" />
        <p className="footer-copy">
          {OPERATOR.fullName}, ИНН {OPERATOR.inn} плательщик налога на профессиональный доход. Контакты: {OPERATOR.email}
        </p>
      </div>
    </footer>
  );
}
