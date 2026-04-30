// ============================================================
// MIDDLEWARE — protect all /(dashboard) routes + API routes
// Uses @supabase/auth-helpers-nextjs to read session cookie.
// Unauthenticated requests → redirect to /login.
// Auth routes (/login) with active session → redirect to /.
// ============================================================

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

// Routes that are public (never require auth)
const PUBLIC_PATHS = ['/login', '/favicon.ico', '/_next', '/api/auth'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// API routes that must be protected (not the public ones above)
function isProtectedApi(pathname: string): boolean {
  return pathname.startsWith('/api/') && !pathname.startsWith('/api/auth');
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session cookie (keeps it alive)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // If on /login and already authenticated → redirect to dashboard home
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Protected routes: dashboard pages + all API routes (except /api/auth)
  const isDashboard = !isPublic(pathname);
  const isApi = isProtectedApi(pathname);

  if ((isDashboard || isApi) && !session) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
