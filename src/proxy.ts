import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, expectedToken } from '@/lib/auth';

// Gate every request behind the shared password. Disabled automatically
// when APP_PASSWORD is unset (local dev). Runs as a Next.js "proxy" (the
// renamed middleware convention in Next 16).
export async function proxy(request: NextRequest) {
  const expected = await expectedToken();
  if (!expected) return NextResponse.next(); // no password configured

  const { pathname } = request.nextUrl;

  // Always let the login screen and its endpoint through.
  if (pathname === '/login' || pathname === '/api/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token === expected) return NextResponse.next();

  // API calls get a clean 401; page loads get redirected to the login.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except Next internals and static image assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
