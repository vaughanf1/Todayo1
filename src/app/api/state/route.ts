// Durable state endpoint: the client's cloud cache of PersistedData.
//
//   GET  /api/state  -> { data: PersistedData | null }
//   PUT  /api/state  -> { ok: true }   (body: PersistedData)
//
// Failures are swallowed into a null/ok response so the client silently
// stays on its localStorage cache when the DB is unavailable.

import { NextRequest, NextResponse } from 'next/server';
import { getState, putState, isDbConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ data: null, configured: false });
  }
  try {
    const data = await getState();
    return NextResponse.json({ data, configured: true });
  } catch (err) {
    console.error('GET /api/state failed:', err);
    return NextResponse.json({ data: null, configured: true, error: true });
  }
}

export async function PUT(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, configured: false });
  }
  try {
    const data = await request.json();
    await putState(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/state failed:', err);
    return NextResponse.json({ ok: false, error: true }, { status: 500 });
  }
}
