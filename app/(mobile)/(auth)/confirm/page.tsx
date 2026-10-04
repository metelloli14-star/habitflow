'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { CodeInput } from '@/components/auth/CodeInput';
import { MailIcon } from '@/components/icons';
import { authApi } from '@/lib/hooks';

function ConfirmForm() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => setDevCode(sessionStorage.getItem('hf_dev_code')), []);

  const complete = /^\d{4}$/.test(code);

  const submit = async () => {
    if (!complete) return;
    setBusy(true);
    setError('');
    try {
      await authApi.verify(email, code);
      sessionStorage.removeItem('hf_dev_code');
      router.replace('/start');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подтвердить email');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const res = await authApi.resend(email);
      if (res.devCode) { sessionStorage.setItem('hf_dev_code', res.devCode); setDevCode(res.devCode); }
      setCode('');
      setInfo('Мы отправили новый код');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить код');
    }
  };

  return (
    <div className="confirm-card">
      <div className="envelope-icon"><MailIcon /></div>
      <div className="confirm-message">
        <p className="t1">Мы отправили письмо на</p>
        <p className="t2">{email || 'ваш email'}</p>
        <p className="t3">Введите код из письма, чтобы подтвердить аккаунт</p>
      </div>
      <CodeInput value={code} onChange={(c) => { setCode(c); setError(''); }} label="Код подтверждения" />
      {devCode && <p className="dev-hint">Тестовый режим: код <b>{devCode}</b> (письма пока не отправляются)</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {info && !error && <p className="dev-hint">{info}</p>}
      <button type="button" className={'cta-mint' + (!complete || busy ? ' disabled' : '')} disabled={!complete || busy} onClick={submit}>
        {busy ? 'Проверяем…' : 'Подтвердить'}
      </button>
      <button type="button" className="resend-link" style={{ background: 'none', border: 'none' }} onClick={resend}>
        Отправить повторно
      </button>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <AuthShell id="screen-confirm" title="Подтверждение" subtitle="Проверьте вашу почту" backHref="/register">
      <Suspense fallback={<div className="screen-loading">Загрузка…</div>}>
        <ConfirmForm />
      </Suspense>
    </AuthShell>
  );
}
