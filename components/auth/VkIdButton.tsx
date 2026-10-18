'use client';

import { useAuthProviders } from '@/lib/hooks';
import { todayStr } from '@/lib/shared/dates';

interface Props {
  mode?: 'login' | 'link';
  /** When set, the button doesn't navigate and calls this instead (e.g. consent not given yet). */
  blockedReason?: string | null;
  onBlocked?: (reason: string) => void;
  label?: string;
}

/**
 * "Войти с VK ID": a full-page redirect to VK ID (not client-side navigation — the server sets the PKCE cookie).
 * Hidden when VK ID isn't configured in production. In development without keys it runs the mock flow.
 * Text only, in the VK ID blue — no home-made logo mark.
 */
export function VkIdButton({ mode = 'login', blockedReason, onBlocked, label = 'Войти с VK ID' }: Props) {
  const { vk } = useAuthProviders();
  if (vk === 'off' || vk === null) return null;

  const go = () => {
    if (blockedReason) {
      onBlocked?.(blockedReason);
      return;
    }
    window.location.href = `/api/auth/vk/start?mode=${mode}&date=${todayStr()}`;
  };

  return (
    <button type="button" className={'vkid-btn' + (blockedReason ? ' is-blocked' : '')} onClick={go}>
      {label}
      {vk === 'mock' && <span className="vkid-mock">тест</span>}
    </button>
  );
}

/** "— или —" before the VK ID button; hidden together with the button, so there's never an "or" with nothing after it. */
export function AuthDivider() {
  const { vk } = useAuthProviders();
  if (vk === 'off' || vk === null) return null;
  return <div className="auth-divider"><span>или</span></div>;
}

/** Reads ?vk_error= left by the VK ID callback, then removes it from the address bar. */
export function readVkErrorFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('vk_error') ?? '';
  if (error || params.has('vk')) {
    params.delete('vk_error');
    const q = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
  }
  return error;
}
