'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { ConsentCheckbox, isValidPassword, PasswordField, TextField } from '@/components/auth/fields';
import { AuthDivider, readVkErrorFromUrl, VkIdButton } from '@/components/auth/VkIdButton';
import { ApiClientError } from '@/lib/client/api';
import { authApi } from '@/lib/hooks';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [touchedPass, setTouchedPass] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Error left by the VK ID callback (e.g. cancelled, or the email already has an account)
  useEffect(() => { const e = readVkErrorFromUrl(); if (e) setError(e); }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (!consent || !email.trim() || !isValidPassword(password)) return;
    setBusy(true);
    try {
      await authApi.login(email.trim(), password);
      router.replace('/home');
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'email_not_verified') {
        if (typeof err.body.devCode === 'string') sessionStorage.setItem('hf_dev_code', err.body.devCode);
        router.push(`/confirm?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell id="screen-login" title="Вход" subtitle="Войдите, чтобы продолжить" backHref="/welcome">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <TextField id="login-email" label="Email" type="email" placeholder="example@mail.ru" autoComplete="email"
          value={email} invalid={submitted && !email.trim()} onChange={setEmail} />
        <PasswordField id="login-pass" label="Пароль" autoComplete="current-password" value={password}
          showError={touchedPass || submitted} onChange={setPassword} onBlur={() => setTouchedPass(true)} />
        <Link href="/forgot" className="forgot-link">Забыли пароль?</Link>
        <ConsentCheckbox checked={consent} onToggle={() => { setConsent((c) => !c); setError(''); }} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className={'cta-solid' + (!consent || busy ? ' disabled' : '')} disabled={busy}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
        <AuthDivider />
        <VkIdButton blockedReason={consent ? null : 'Отметьте согласие с документами, чтобы продолжить'} onBlocked={setError} />
        <p className="switch-link">Нет аккаунта? <Link href="/register">Зарегистрируйтесь</Link></p>
      </form>
    </AuthShell>
  );
}
