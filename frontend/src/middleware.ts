import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/',
  '/health',
  '/api-tester',
  '/profile',
  '/settings/account',
  '/settings/security',
  '/admin',
  '/dispatcher',
  '/courier',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for the access or refresh token cookie (presence check only —
  // the backend is authoritative for actual token validation)
  const accessToken = request.cookies.get('sd_access_token');
  const refreshToken = request.cookies.get('sd_refresh_token');
  const hasAuth = !!accessToken || !!refreshToken;

  // Protected routes: redirect to /login if no auth cookies
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(route + '/'))
  );

  if (isProtected && !hasAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes: redirect to / if already authenticated
  const isAuthRoute = authRoutes.some((route) => pathname === route);
  if (isAuthRoute && hasAuth) {
    return NextResponse.redirect(new URL('/', request.url));
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

