'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { CodeInput } from '@/components/auth/CodeInput';
import { isValidPassword, PasswordField } from '@/components/auth/fields';
import { authApi } from '@/lib/hooks';

function ResetForm() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [touched, setTouched] = useState({ p1: false, p2: false });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => setDevCode(sessionStorage.getItem('hf_dev_code')), []);

  const mismatch = password2.length > 0 && password !== password2;
  const ready = /^\d{4}$/.test(code) && isValidPassword(password) && password === password2;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (!ready) return;
    setBusy(true);
    try {
      await authApi.resetPassword(email, code, password);
      sessionStorage.removeItem('hf_dev_code');
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сменить пароль');
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const res = await authApi.forgotPassword(email);
      if (res.devCode) { sessionStorage.setItem('hf_dev_code', res.devCode); setDevCode(res.devCode); }
      setCode('');
      setInfo('Если аккаунт с этим email есть, мы отправили новый код. Повторно — не чаще раза в минуту.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить код');
    }
  };

  return (
    <form className="auth-card" onSubmit={onSubmit} noValidate>
      <p className="auth-note">Если аккаунт с адресом <b>{email || 'вашим email'}</b> существует, мы отправили на него код. Он действует 15 минут.</p>
      <CodeInput value={code} onChange={(c) => { setCode(c); setError(''); }} />
      {devCode && <p className="dev-hint">Тестовый режим: код <b>{devCode}</b> (письма пока не отправляются)</p>}
      <PasswordField id="reset-pass" label="Новый пароль" autoComplete="new-password" value={password}
        showError={touched.p1 || submitted} onChange={setPassword} onBlur={() => setTouched((t) => ({ ...t, p1: true }))} />
      <PasswordField id="reset-pass2" label="Повторите пароль" autoComplete="new-password" value={password2}
        showError={touched.p2 || submitted} errorText={mismatch ? 'Пароли не совпадают' : undefined}
        onChange={setPassword2} onBlur={() => setTouched((t) => ({ ...t, p2: true }))} />
      {error && <p className="form-error" role="alert">{error}</p>}
      {info && !error && <p className="dev-hint">{info}</p>}
      <button type="submit" className={'cta-mint' + (!ready || busy ? ' disabled' : '')} disabled={busy}>
        {busy ? 'Сохраняем…' : 'Сохранить пароль и войти'}
      </button>
      <button type="button" className="resend-link" style={{ background: 'none', border: 'none' }} onClick={resend}>
        Отправить код повторно
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell id="screen-reset" title="Новый пароль" subtitle="Введите код из письма и придумайте новый пароль" backHref="/forgot">
      <Suspense fallback={<div className="screen-loading">Загрузка…</div>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
