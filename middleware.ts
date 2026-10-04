import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/shared/constants';

// App screens require a session cookie. (The cookie itself is validated by the API;
// if it's stale, the app layout gets a 401 and sends the person to /welcome.)
const PROTECTED = ['/home', '/water', '/habits', '/goals', '/profile', '/stats', '/menu'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected && !req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL('/welcome', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|images|favicon.ico).*)'],
};
