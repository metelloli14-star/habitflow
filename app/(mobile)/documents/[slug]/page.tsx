'use client';

import { useParams, useRouter } from 'next/navigation';
import { StatusBar } from '@/components/StatusBar';
import { BackIcon } from '@/components/icons';
import { LEGAL_DOCUMENTS, type LegalBlock } from '@/lib/shared/legal';

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{block}</p>;
  return (
    <ul>
      {block.list.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

// Legal documents: /documents/privacy-policy, /documents/personal-data. Texts live in lib/shared/legal/.
export default function DocumentPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const doc = LEGAL_DOCUMENTS[slug];

  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/'));

  return (
    <section id="screen-document" className="screen active">
      <div className="document-scroll">
        <StatusBar />
        <div className="document-header">
          <button className="document-back-btn" onClick={goBack} aria-label="Назад"><BackIcon /></button>
          <h1>{doc?.title ?? 'Документ не найден'}</h1>
        </div>
        <article className="document-body">
          {doc ? (
            <>
              <p className="document-updated">Редакция от {doc.updatedAt}</p>
              {doc.intro.map((b, i) => <Block key={`intro-${i}`} block={b} />)}
              {doc.sections.map((s) => (
                <section key={s.heading}>
                  <h2>{s.heading}</h2>
                  {s.blocks.map((b, i) => <Block key={i} block={b} />)}
                </section>
              ))}
            </>
          ) : (
            <p>Такого документа нет. Вернитесь назад.</p>
          )}
        </article>
      </div>
    </section>
  );
}
