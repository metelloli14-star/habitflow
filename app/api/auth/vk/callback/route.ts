import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCurrentUser, startSession } from '@/lib/server/auth';
import { ApiError } from '@/lib/server/http';
import { linkVk, loginWithVk } from '@/lib/server/services/users';
import { fetchVkProfile, VK_FLOW_COOKIE } from '@/lib/server/vkid';
import { isValidDateStr, todayStr } from '@/lib/shared/dates';

interface Flow { state: string; verifier: string; mode: 'login' | 'link'; date: string }

// GET /api/auth/vk/callback?code&state&device_id — VK ID redirects here after the person agrees.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const store = await cookies();
  let flow: Flow | null = null;
  try { flow = JSON.parse(store.get(VK_FLOW_COOKIE)?.value ?? 'null') as Flow | null; } catch { flow = null; }
  store.delete({ name: VK_FLOW_COOKIE, path: '/api/auth/vk' });

  const back = (path: string, error?: string) =>
    NextResponse.redirect(new URL(error ? `${path}?vk_error=${encodeURIComponent(error)}` : path, url.origin));
  const failPath = flow?.mode === 'link' ? '/profile' : '/login';

  if (url.searchParams.get('error')) return back(failPath, 'Вход через VK ID отменён');
  const code = url.searchParams.get('code');
  const deviceId = url.searchParams.get('device_id');
  // state must match what we generated, otherwise it could be a forged request
  if (!flow || !code || !deviceId || url.searchParams.get('state') !== flow.state) {
    return back(failPath, 'Сеанс входа через VK ID устарел. Попробуйте ещё раз');
  }

  try {
    const profile = await fetchVkProfile(code, deviceId, flow.verifier, flow.state);
    if (flow.mode === 'link') {
      const user = await getCurrentUser();
      if (!user) return back('/login', 'Войдите в аккаунт, чтобы привязать VK ID');
      await linkVk(user, profile);
      return back('/profile?vk=linked');
    }
    const { user, created } = await loginWithVk(profile, isValidDateStr(flow.date) ? flow.date : todayStr());
    await startSession(user.id);
    return back(created ? '/start' : '/home');
  } catch (err) {
    if (!(err instanceof ApiError)) console.error('[vk-id] callback failed:', err);
    return back(failPath, err instanceof ApiError ? err.message : 'Не удалось войти через VK ID');
  }
}
