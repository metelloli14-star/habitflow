'use client';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (value: T) => void;
  className?: string;
  pillClassName?: string;
  ariaLabel: string;
}

/** Single-choice row of pills (category, frequency, gender, water goal…). */
export function PillGroup<T extends string>({ options, value, onChange, className = 'addhabit-pill-row', pillClassName = 'addhabit-pill', ariaLabel }: Props<T>) {
  return (
    <div className={className} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={pillClassName + (value === o.value ? ' active' : '')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
