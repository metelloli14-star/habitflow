import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requestDate } from '@/lib/server/http';
import { authorizeUrl, newPkce, VK_FLOW_COOKIE, vkIdMode } from '@/lib/server/vkid';

// GET /api/auth/vk/start?mode=login|link&date=YYYY-MM-DD — sends the browser to VK ID.
// The PKCE verifier and state live in a short-lived httpOnly cookie until VK redirects back.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') === 'link' ? 'link' : 'login';
  if (vkIdMode() === 'off') {
    return NextResponse.redirect(new URL(`/${mode === 'link' ? 'profile' : 'login'}?vk_error=${encodeURIComponent('Вход через VK ID пока не настроен')}`, url.origin));
  }
  const { verifier, challenge, state } = newPkce();
  (await cookies()).set(VK_FLOW_COOKIE, JSON.stringify({ state, verifier, mode, date: requestDate(req) }), {
    httpOnly: true,
    sameSite: 'lax', // VK redirects back with a top-level GET, which Lax cookies allow
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/vk',
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(authorizeUrl(state, challenge, url.origin));
}
