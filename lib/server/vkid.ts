// VK ID (OAuth 2.1 + PKCE) — server side, no SDK.
// Flow: /api/auth/vk/start → id.vk.ru/authorize → /api/auth/vk/callback (code, state, device_id)
//       → POST /oauth2/auth (token) → POST /oauth2/user_info (profile).
//
// Configuration (.env.local):
//   VK_ID_CLIENT_ID     — application ID from the VK ID dashboard (id.vk.ru)
//   VK_ID_REDIRECT_URI  — must match the "Доверенный Redirect URL" in the dashboard exactly,
//                         e.g. https://poleznyeprivychki.ru/api/auth/vk/callback
//   VK_ID_BASE_URL      — optional, defaults to https://id.vk.ru
// Without VK_ID_CLIENT_ID the app uses a MOCK VK ID in development (so you can test the UI),
// and hides the VK button in production.

import { createHash, randomBytes } from 'node:crypto';
import { ApiError } from './http';

/** Short-lived cookie holding the PKCE verifier + state between /start and /callback. */
export const VK_FLOW_COOKIE = 'hf_vk_flow';

export type VkIdMode = 'live' | 'mock' | 'off';

export interface VkProfile {
  vkId: string;
  firstName: string;
  lastName: string;
  /** Only if the person allowed it in VK ID. */
  email: string | null;
}

const base64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function vkIdMode(): VkIdMode {
  if (process.env.VK_ID_CLIENT_ID && process.env.VK_ID_REDIRECT_URI) return 'live';
  return process.env.NODE_ENV === 'production' ? 'off' : 'mock';
}

const baseUrl = () => (process.env.VK_ID_BASE_URL || 'https://id.vk.ru').replace(/\/$/, '');

export function newPkce() {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  const state = base64url(randomBytes(24));
  return { verifier, challenge, state };
}

/** Where to send the browser. In mock mode it goes straight to our own callback. */
export function authorizeUrl(state: string, challenge: string, origin: string): string {
  if (vkIdMode() === 'mock') {
    return `${origin}/api/auth/vk/callback?code=mock-code&state=${encodeURIComponent(state)}&device_id=mock-device`;
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.VK_ID_CLIENT_ID!,
    redirect_uri: process.env.VK_ID_REDIRECT_URI!,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'email',
  });
  return `${baseUrl()}/authorize?${params}`;
}

async function postForm<T>(path: string, form: Record<string, string>): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; error_description?: string };
  if (!res.ok || data.error) {
    console.error('[vk-id]', path, res.status, data.error, data.error_description);
    throw new ApiError(502, 'VK ID не ответил. Попробуйте ещё раз', 'vk_error');
  }
  return data;
}

/** Exchanges the callback code for the person's VK profile. */
export async function fetchVkProfile(code: string, deviceId: string, verifier: string, state: string): Promise<VkProfile> {
  if (vkIdMode() === 'mock') {
    return { vkId: 'mock-1000001', firstName: 'Тестовый', lastName: 'Пользователь VK', email: 'vk.test@example.ru' };
  }
  const token = await postForm<{ access_token: string; user_id: number | string }>('/oauth2/auth', {
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    client_id: process.env.VK_ID_CLIENT_ID!,
    device_id: deviceId,
    redirect_uri: process.env.VK_ID_REDIRECT_URI!,
    state,
  });
  const info = await postForm<{ user?: { user_id?: string | number; first_name?: string; last_name?: string; email?: string } }>(
    '/oauth2/user_info',
    { client_id: process.env.VK_ID_CLIENT_ID!, access_token: token.access_token },
  );
  const u = info.user ?? {};
  return {
    vkId: String(u.user_id ?? token.user_id),
    firstName: (u.first_name || '').trim(),
    lastName: (u.last_name || '').trim(),
    email: u.email ? u.email.trim().toLowerCase() : null,
  };
}
