'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { avatarStyle, initialOf } from '@/components/AvatarButton';
import { CodeInput } from '@/components/auth/CodeInput';
import { readVkErrorFromUrl, VkIdButton } from '@/components/auth/VkIdButton';
import { ConsentText } from '@/components/auth/fields';
import { BottomNav } from '@/components/BottomNav';
import { ConfirmModal, SuccessModal } from '@/components/Modals';
import { PillGroup } from '@/components/PillGroup';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBar } from '@/components/StatusBar';
import { resizeImageToDataUrl } from '@/lib/client/image';
import { authApi, profileApi, useSession } from '@/lib/hooks';
import { SITE_URL } from '@/lib/shared/constants';
import type { Gender } from '@/lib/shared/types';

interface Draft {
  name: string;
  email: string;
  gender: Gender;
  /** undefined = keep the saved photo, null = remove it, string = new photo */
  avatar: string | null | undefined;
}

// Edits are a local draft until "Сохранить изменения" (with consent) — leaving the screen discards them.
export default function ProfilePage() {
  const router = useRouter();
  const { user } = useSession();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // New-email confirmation
  const [emailCode, setEmailCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailInfo, setEmailInfo] = useState('');
  const [emailDevCode, setEmailDevCode] = useState<string | null>(null);
  const [emailChangedOpen, setEmailChangedOpen] = useState(false);
  // VK ID link / unlink
  const [vkError, setVkError] = useState('');
  const [vkNotice, setVkNotice] = useState('');

  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get('vk') === 'linked';
    const e = readVkErrorFromUrl();
    if (e) setVkError(e);
    if (linked) {
      setVkNotice('VK ID привязан. Теперь можно входить через VK ID');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const unlinkVk = async () => {
    setVkError('');
    setVkNotice('');
    try {
      await profileApi.unlinkVk();
      setVkNotice('VK ID отвязан');
    } catch (err) {
      setVkError(err instanceof Error ? err.message : 'Не удалось отвязать VK ID');
    }
  };

  useEffect(() => {
    if (user && !draft) setDraft({ name: user.name, email: user.email, gender: user.gender, avatar: undefined });
  }, [user, draft]);

  // Any edit asks for consent again before it can be saved.
  const edit = (patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setConsent(false);
    setError('');
  };

  const photo = draft?.avatar === undefined ? user?.avatar ?? null : draft.avatar;
  const previewName = draft?.name.trim() || user?.name || '';

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      edit({ avatar: await resizeImageToDataUrl(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото');
    }
  };

  const save = async () => {
    if (!draft || !consent) return;
    setSaving(true);
    setError('');
    try {
      const { user: saved, devCode } = await profileApi.update({
        name: draft.name,
        email: draft.email.trim(),
        gender: draft.gender,
        ...(draft.avatar !== undefined ? { avatar: draft.avatar } : {}),
      });
      // A new email isn't applied until it's confirmed: the field shows the current one again.
      setDraft((d) => (d ? { ...d, avatar: undefined, email: saved.email } : d));
      if (devCode) setEmailDevCode(devCode);
      setEmailCode('');
      setEmailError('');
      setEmailInfo('');
      setSavedOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const confirmNewEmail = async () => {
    setEmailBusy(true);
    setEmailError('');
    try {
      const { user: updated } = await profileApi.confirmEmail(emailCode);
      setDraft((d) => (d ? { ...d, email: updated.email } : d));
      setEmailCode('');
      setEmailDevCode(null);
      setEmailChangedOpen(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Не удалось подтвердить email');
    } finally {
      setEmailBusy(false);
    }
  };

  const resendNewEmailCode = async () => {
    setEmailError('');
    try {
      const res = await profileApi.resendEmailCode();
      if (res.devCode) setEmailDevCode(res.devCode);
      setEmailCode('');
      setEmailInfo('Мы отправили новый код');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Не удалось отправить код');
    }
  };

  const cancelNewEmail = async () => {
    setEmailError('');
    try {
      await profileApi.cancelEmailChange();
      setEmailCode('');
      setEmailDevCode(null);
      setEmailInfo('');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Не удалось отменить смену email');
    }
  };

  const logout = async () => {
    await authApi.logout();
    router.replace('/welcome');
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await profileApi.deleteAccount();
      window.location.href = SITE_URL;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить аккаунт');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <section id="screen-profile" className="screen active">
      <ScreenBackground className="profile-bg-photo" src="/images/profile-bg.jpg" />
      <div className="profile-scroll">
        <StatusBar />
        <ScreenHeader className="profile-page-header" subtitleClassName="profile-subtitle" title="Личный кабинет" subtitle="Настройки профиля"
          avatarPreview={{ name: previewName, photo }} />

        {!draft ? (
          <div className="screen-loading">Загрузка…</div>
        ) : (
          <>
            <div className="profile-avatar-card">
              <button type="button" className="profile-avatar-big" style={{ border: 'none', ...avatarStyle(photo) }}
                onClick={() => fileRef.current?.click()} aria-label={photo ? 'Изменить фото' : 'Добавить фото'}>
                {photo ? null : initialOf(previewName)}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
              <p className="profile-photo-hint">{photo ? 'Нажмите чтобы изменить фото' : 'Нажмите чтобы добавить фото'}</p>
              {photo && (
                <button type="button" className="profile-remove-photo-link" onClick={() => edit({ avatar: null })}>Удалить фото</button>
              )}
              <p className="profile-display-name">{previewName}</p>
            </div>

            <div className="profile-info-card">
              <h3>Личная информация</h3>
              <div className="addhabit-field">
                <label htmlFor="profile-name">Имя</label>
                <input id="profile-name" className="addhabit-input" type="text" maxLength={60} placeholder="Имя"
                  value={draft.name} onChange={(e) => edit({ name: e.target.value })} />
              </div>
              <div className="addhabit-field">
                <label>Пол</label>
                <PillGroup<Exclude<Gender, ''>>
                  ariaLabel="Пол"
                  options={[{ value: 'Мужской', label: 'Мужской' }, { value: 'Женский', label: 'Женский' }]}
                  value={draft.gender}
                  onChange={(g) => edit({ gender: g })}
                />
              </div>
              <div className="addhabit-field" style={{ marginBottom: 0 }}>
                <label htmlFor="profile-email">Email</label>
                <input id="profile-email" className="addhabit-input" type="email" placeholder="you@example.com"
                  value={draft.email} onChange={(e) => edit({ email: e.target.value })} />
              </div>
              {user?.pendingEmail && (
                <div className="email-change-panel" role="region" aria-label="Подтверждение нового email">
                  <p className="email-change-text">
                    Мы отправили код на <b>{user.pendingEmail}</b>. Введите его, чтобы сменить email.
                    До подтверждения для входа используется <b>{user.email}</b>.
                  </p>
                  <CodeInput value={emailCode} onChange={(c) => { setEmailCode(c); setEmailError(''); }} />
                  {emailDevCode && <p className="dev-hint">Тестовый режим: код <b>{emailDevCode}</b></p>}
                  {emailError && <p className="form-error" role="alert">{emailError}</p>}
                  {emailInfo && !emailError && <p className="dev-hint">{emailInfo}</p>}
                  <button type="button" className={'cta-mint' + (!/^\d{4}$/.test(emailCode) || emailBusy ? ' disabled' : '')}
                    disabled={!/^\d{4}$/.test(emailCode) || emailBusy} onClick={confirmNewEmail}>
                    {emailBusy ? 'Проверяем…' : 'Подтвердить новый email'}
                  </button>
                  <div className="email-change-actions">
                    <button type="button" className="text-link-btn" onClick={resendNewEmailCode}>Отправить повторно</button>
                    <button type="button" className="text-link-btn muted" onClick={cancelNewEmail}>Отменить смену</button>
                  </div>
                </div>
              )}
              <div className="vk-link-row">
                <span className="vkid-mark" aria-hidden="true">VK</span>
                <div className="vk-link-info">
                  <p>VK ID</p>
                  <span>{user?.vkLinked ? 'Привязан — можно входить через VK ID' : 'Не привязан'}</span>
                </div>
                {user?.vkLinked
                  ? <button type="button" className="text-link-btn muted" onClick={unlinkVk}>Отвязать</button>
                  : <VkIdButton mode="link" label="Привязать" />}
              </div>
              {vkError && <p className="form-error" role="alert" style={{ marginTop: 10 }}>{vkError}</p>}
              {vkNotice && !vkError && <p className="form-success" style={{ marginTop: 10 }}>{vkNotice}</p>}
              <div className="profile-consent-row">
                <button type="button" className={'profile-consent-check' + (consent ? ' checked' : '')} aria-pressed={consent}
                  aria-label="Согласен и ознакомлен с политикой конфиденциальности и обработкой персональных данных" onClick={() => setConsent((c) => !c)}>
                  {consent ? '✓' : ''}
                </button>
                <span><ConsentText /></span>
              </div>
            </div>

            {error && <p className="form-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
            <button className={'profile-save-btn' + (!consent || saving ? ' disabled' : '')} disabled={!consent || saving} onClick={save}>
              {saving ? 'Сохраняем…' : 'Сохранить изменения'}
            </button>
            <button className="profile-logout-btn" onClick={logout}>Выйти из аккаунта</button>
            <button className="profile-delete-account-btn" onClick={() => setDeleteOpen(true)}>Удалить аккаунт</button>
          </>
        )}
      </div>
      <BottomNav />
      <SuccessModal open={savedOpen}
        title={user?.pendingEmail ? 'Изменения сохранены. Подтвердите новый email кодом из письма' : 'Изменения сохранены'}
        onClose={() => setSavedOpen(false)} />
      <SuccessModal open={emailChangedOpen} title="Email изменён" onClose={() => setEmailChangedOpen(false)} />
      <ConfirmModal
        open={deleteOpen}
        title="Вы уверены?"
        text="Все привычки, вода, цели, фото и настройки профиля будут удалены безвозвратно. Это действие нельзя отменить."
        confirmLabel="Да, удалить"
        busy={deleting}
        onConfirm={deleteAccount}
        onClose={() => setDeleteOpen(false)}
      />
    </section>
  );
}
