'use client';

import { useState } from 'react';
import { profileApi, usePush, useSession, type PushStatus } from '@/lib/hooks';
import { BellIcon } from './icons';

const TEXT: Record<PushStatus, string> = {
  loading: 'Проверяем…',
  on: 'Включены на этом устройстве — напоминания придут, даже когда приложение закрыто',
  off: 'Напоминания о привычках будут приходить, даже когда приложение закрыто',
  denied: 'Запрещены в настройках браузера или телефона. Разрешите уведомления для сайта и откройте приложение заново',
  'ios-install': 'На iPhone: нажмите «Поделиться» → «На экран „Домой“», откройте приложение с экрана «Домой» и включите уведомления здесь',
  'ios-update': 'Нужен iOS 16.4 или новее',
  unsupported: 'Этот браузер не поддерживает push-уведомления',
  unavailable: 'Пока не настроены на сервере',
};

/** "Уведомления" row in the profile: turns push reminders on or off for this device. */
export function PushToggle() {
  const { status, busy, error, enable, disable } = usePush();
  const { user } = useSession();
  const [prefError, setPrefError] = useState('');

  const setPref = async (patch: { waterReminders?: boolean; weeklySummary?: boolean }) => {
    setPrefError('');
    try {
      await profileApi.update(patch);
    } catch {
      setPrefError('Не удалось сохранить настройку');
    }
  };

  return (
    <>
      <div className="push-row">
        <span className="push-row-icon" aria-hidden="true"><BellIcon /></span>
        <div className="vk-link-info">
          <p>Уведомления</p>
          <span>{TEXT[status]}</span>
        </div>
        {status === 'off' && (
          <button type="button" className="push-btn" onClick={enable} disabled={busy}>Включить</button>
        )}
        {status === 'on' && (
          <button type="button" className="text-link-btn muted" onClick={disable} disabled={busy}>Отключить</button>
        )}
      </div>
      {status === 'on' && user && (
        <div className="push-prefs">
          <label className="push-pref">
            <input type="checkbox" checked={user.waterReminders} onChange={(e) => void setPref({ waterReminders: e.target.checked })} />
            <span><b>Напоминать пить воду</b>каждые 2 часа с 10 до 20, пока норма не выполнена</span>
          </label>
          <label className="push-pref">
            <input type="checkbox" checked={user.weeklySummary} onChange={(e) => void setPref({ weeklySummary: e.target.checked })} />
            <span><b>Итоги недели</b>по воскресеньям в 20:00</span>
          </label>
        </div>
      )}
      {(error || prefError) && <p className="form-error" role="alert" style={{ marginTop: 10 }}>{error || prefError}</p>}
    </>
  );
}
