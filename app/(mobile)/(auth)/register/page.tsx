'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { ConsentCheckbox, isValidPassword, PasswordField, TextField } from '@/components/auth/fields';
import { AuthDivider, readVkErrorFromUrl, VkIdButton } from '@/components/auth/VkIdButton';
import { authApi } from '@/lib/hooks';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState({ p1: false, p2: false });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { const e = readVkErrorFromUrl(); if (e) setError(e); }, []);

  const mismatch = password2.length > 0 && password !== password2;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (!consent || !name.trim() || !email.trim() || !isValidPassword(password) || password !== password2) return;
    setBusy(true);
    try {
      const res = await authApi.register(name.trim(), email.trim(), password);
      if (res.devCode) sessionStorage.setItem('hf_dev_code', res.devCode);
      router.push(`/confirm?email=${encodeURIComponent(res.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать аккаунт');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell id="screen-registration" title="Регистрация" subtitle="Создайте аккаунт, чтобы начать путь" backHref="/login">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <TextField id="reg-name" label="Имя" placeholder="Иван Иванов" autoComplete="name"
          value={name} invalid={submitted && !name.trim()} onChange={setName} />
        <TextField id="reg-email" label="Email" type="email" placeholder="example@mail.ru" autoComplete="email"
          value={email} invalid={submitted && !email.trim()} onChange={setEmail} />
        <PasswordField id="reg-pass" label="Пароль" autoComplete="new-password" value={password}
          showError={touched.p1 || submitted} onChange={setPassword} onBlur={() => setTouched((t) => ({ ...t, p1: true }))} />
        <PasswordField id="reg-pass2" label="Повторите пароль" autoComplete="new-password" value={password2}
          showError={touched.p2 || submitted} errorText={mismatch ? 'Пароли не совпадают' : undefined}
          onChange={setPassword2} onBlur={() => setTouched((t) => ({ ...t, p2: true }))} />
        <ConsentCheckbox withTerms checked={consent} onToggle={() => { setConsent((c) => !c); setError(''); }} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className={'cta-solid' + (!consent || busy ? ' disabled' : '')} disabled={busy}>
          {busy ? 'Создаём…' : 'Создать аккаунт'}
        </button>
        <AuthDivider />
        <VkIdButton label="Продолжить с VK ID" blockedReason={consent ? null : 'Отметьте согласие с документами, чтобы продолжить'} onBlocked={setError} />
      </form>
    </AuthShell>
  );
}
