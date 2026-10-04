import type { CSSProperties } from 'react';

/** Logo mark: chart line in the gradient square. */
export function BrandIcon({ style }: { style?: CSSProperties }) {
  return (
    <div className="brand-icon" style={style}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 16c.5-2.5 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4-4.5 5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function BrandName() {
  return (
    <div className="brand-name">
      <span className="title">Привычка</span>
      <span className="sub">В ритме жизни</span>
    </div>
  );
}
