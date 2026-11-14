import { NextRequest, NextResponse } from 'next/server';

/**
 * Routes that require an authenticated session cookie.
 * Note: `/` (Landing Page) and `/tracking` (Public Parcel Tracking) are intentionally PUBLIC.
 */
const protectedRoutes = [
  '/customer',
  '/merchant',
  '/courier',
  '/dispatcher',
  '/branch',
  '/admin',
  '/organization',
  '/book',
  '/bookings',
  '/customers',
  '/health',
  '/api-tester',
  '/profile',
  '/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for the access token, refresh token, or session hint cookie set by Identity Service.
  // Note: `sd_refresh_token` is scoped to path `/api/v1/auth`, while `sd_access_token` (15m)
  // and `sd_auth_hint` (7d) are scoped to path `/`. Checking `sd_auth_hint` allows the client
  // to transparently refresh an expired access token via `/api/v1/auth/refresh` without a premature redirect.
  const accessToken = request.cookies.get('sd_access_token');
  const refreshToken = request.cookies.get('sd_refresh_token');
  const authHint = request.cookies.get('sd_auth_hint');
  const hasAuth = !!accessToken || !!refreshToken || !!authHint;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtected && !hasAuth) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes (/api/...)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (e.g. .svg, .png, .jpg)
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
};
