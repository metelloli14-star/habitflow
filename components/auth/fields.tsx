'use client';

import Link from 'next/link';
import { useState } from 'react';
import { EyeIcon } from '../icons';

export const PASSWORD_HINT = 'Минимум 8 символов, без пробелов';
export const isValidPassword = (p: string) => p.length >= 8 && !/\s/.test(p);

interface TextFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  invalid?: boolean;
  onChange: (v: string) => void;
}

export function TextField({ id, label, type = 'text', value, placeholder, autoComplete, invalid, onChange }: TextFieldProps) {
  return (
    <div className={'field' + (invalid ? ' invalid' : '')}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input id={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  /** Show the error state (after blur or a submit attempt). */
  showError: boolean;
  errorText?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}

/** Password input with the eye toggle. Spaces are filtered out as you type. */
export function PasswordField({ id, label, value, autoComplete, showError, errorText, onChange, onBlur }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const invalid = showError && (value.length === 0 || !isValidPassword(value) || !!errorText);
  return (
    <div className={'field' + (invalid ? ' invalid' : '')}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, ''))}
          onBlur={onBlur}
        />
        <button type="button" className="eye-btn" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}>
          <EyeIcon />
        </button>
      </div>
      <p className={'hint' + (invalid ? ' error' : '')}>{invalid && errorText ? errorText : PASSWORD_HINT}</p>
    </div>
  );
}

/**
 * Consent text with links to the legal documents. Shared by login, registration and the profile screen.
 * `withTerms` (registration only — that's where the user agreement is accepted) adds the terms link.
 */
export function ConsentText({ withTerms = false }: { withTerms?: boolean }) {
  return (
    <>
      Согласен и ознакомлен с{' '}
      <Link className="consent-link" href="/documents/privacy-policy">политикой конфиденциальности</Link>
      {' '}и{' '}
      <Link className="consent-link" href="/documents/personal-data">обработкой персональных данных</Link>
      {withTerms && (
        <>
          , принимаю{' '}
          <Link className="consent-link" href="/documents/terms">пользовательское соглашение</Link>
        </>
      )}
    </>
  );
}

/** Consent checkbox (unchecked by default, as the law requires). */
export function ConsentCheckbox({ checked, onToggle, withTerms = false }: { checked: boolean; onToggle: () => void; withTerms?: boolean }) {
  const label = 'Согласен и ознакомлен с политикой конфиденциальности и обработкой персональных данных' +
    (withTerms ? ', принимаю пользовательское соглашение' : '');
  return (
    <div className="consent-row">
      <button type="button" className={'checkbox' + (checked ? ' checked' : '')} aria-pressed={checked} aria-label={label} onClick={onToggle}>
        {checked ? '✓' : ''}
      </button>
      <p><ConsentText withTerms={withTerms} /></p>
    </div>
  );
}
