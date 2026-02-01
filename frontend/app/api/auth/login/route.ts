import { NextResponse } from 'next/server';

import { env } from '@/lib/env';

export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${env.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const token = data.access_token;
  const response = NextResponse.json({ ok: true });
  response.cookies.set('access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  return response;
}

