import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, expectedToken, tokenFor } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const expected = await expectedToken();
  // No password configured — nothing to log into.
  if (!expected) return NextResponse.json({ ok: true, gated: false });

  let password = '';
  try {
    const body = await request.json();
    if (typeof body?.password === 'string') password = body.password;
  } catch {
    // empty / malformed body → treated as a wrong password
  }

  if ((await tokenFor(password)) !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
