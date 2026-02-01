import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('access_token')?.value;

  const isAuthRoute = pathname.startsWith('/login');
  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/students') ||
    pathname.startsWith('/collect') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings');

  if (isAppRoute && !token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && token) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/students/:path*',
    '/collect/:path*',
    '/transactions/:path*',
    '/reports/:path*',
    '/settings/:path*'
  ]
};

