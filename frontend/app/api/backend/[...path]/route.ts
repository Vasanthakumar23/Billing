import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function backendBaseUrl() {
  return (
    process.env.BACKEND_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:8000/api'
  ).replace(/\/+$/, '');
}

async function handler(req: NextRequest, ctx: { params: { path: string[] } }) {
  const token = cookies().get('access_token')?.value;
  if (!token) return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });

  const path = ctx.params.path.join('/');
  const url = new URL(req.url);
  const target = `${backendBaseUrl()}/${path}${url.search}`;

  const headers = new Headers(req.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.delete('host');

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text()
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.text() : await res.arrayBuffer();

  const out = new NextResponse(body as any, { status: res.status });
  res.headers.forEach((v, k) => {
    if (k.toLowerCase() === 'transfer-encoding') return;
    out.headers.set(k, v);
  });
  return out;
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;

