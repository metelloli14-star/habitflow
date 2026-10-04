'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { TextField } from '@/components/auth/fields';
import { authApi } from '@/lib/hooks';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res.devCode) sessionStorage.setItem('hf_dev_code', res.devCode);
      else sessionStorage.removeItem('hf_dev_code');
      router.push(`/reset?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить код');
      setBusy(false);
    }
  };

  return (
    <AuthShell id="screen-forgot" title="Восстановление пароля" subtitle="Пришлём код на email, указанный при регистрации" backHref="/login">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <TextField id="forgot-email" label="Email" type="email" placeholder="example@mail.ru" autoComplete="email"
          value={email} invalid={submitted && !email.trim()} onChange={setEmail} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className={'cta-solid' + (busy ? ' disabled' : '')} disabled={busy}>
          {busy ? 'Отправляем…' : 'Получить код'}
        </button>
        <p className="switch-link">Вспомнили пароль? <Link href="/login">Войти</Link></p>
      </form>
    </AuthShell>
  );
}
