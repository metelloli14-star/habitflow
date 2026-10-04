'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

/** Four boxes for a 4-digit email code: auto-advance, Backspace goes back, pasting "1234" fills all boxes. */
export function CodeInput({ value, onChange, label = 'Код из письма' }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? '');

  const setDigit = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, j) => (j === i ? v : d)).join('');
    onChange(next.replace(/\s/g, ''));
    if (v && i < 3) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 1) {
      e.preventDefault();
      onChange(pasted);
      inputs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <p className="code-label">{label}</p>
      <div className="code-digits">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            aria-label={`Цифра ${i + 1}`}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
          />
        ))}
      </div>
    </div>
  );
}
