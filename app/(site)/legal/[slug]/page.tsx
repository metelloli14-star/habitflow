import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { LEGAL_DOCUMENTS, type LegalBlock } from '@/lib/shared/legal';

type Props = { params: Promise<{ slug: string }> };

// Pre-rendered at build time: /legal/privacy-policy, /legal/personal-data
export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((slug) => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = LEGAL_DOCUMENTS[(await params).slug];
  return doc ? { title: doc.title } : {};
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{block}</p>;
  return <ul>{block.list.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;
  const doc = LEGAL_DOCUMENTS[slug];
  if (!doc) notFound();

  return (
    <div className="page">
      <div className="grid-full" />
      <SiteHeader />
      <main className="legal-page">
        <Link href="/" className="legal-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          На главную
        </Link>
        <article className="legal-panel">
          <h1>{doc.title}</h1>
          <p className="doc-updated">Редакция от {doc.updatedAt}</p>
          {doc.intro.map((b, i) => <Block key={`intro-${i}`} block={b} />)}
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.blocks.map((b, i) => <Block key={i} block={b} />)}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter currentDoc={slug} />
    </div>
  );
}
