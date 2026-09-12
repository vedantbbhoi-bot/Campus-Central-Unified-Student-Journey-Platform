import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get('token');
  const token = tokenCookie?.value;

  const user = token ? await verifyToken(token) : null;

  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/assignments') ||
    pathname.startsWith('/notices') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/admin');

  const isAuthPath = pathname.startsWith('/login');

  // Bounce unauthenticated users trying to access protected paths back to /login
  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login page to /dashboard
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/attendance/:path*',
    '/assignments/:path*',
    '/notices/:path*',
    '/calendar/:path*',
    '/admin/:path*',
    '/login',
  ],
};
