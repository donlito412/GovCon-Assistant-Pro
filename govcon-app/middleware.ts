import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

const PROTECTED_PAGE_PREFIXES = [
  '/',
  '/contracts',
  '/grants',
  '/events',
  '/analytics',
  '/agencies',
  '/awards',
  '/forecasts',
  '/recompetes',
  '/pipeline',
  '/bids',
  '/outreach',
  '/saved-searches',
  '/assistant',
  '/community',
  '/contacts',
  '/vendors',
  '/opportunities',
  '/settings',
];

const PROTECTED_API_PREFIXES = [
  '/api/assistant',
  '/api/analytics',
  '/api/agencies',
  '/api/awards',
  '/api/bids',
  '/api/community',
  '/api/company-search',
  '/api/contacts',
  '/api/contracts',
  '/api/events',
  '/api/forecasts',
  '/api/grants',
  '/api/outreach',
  '/api/pipeline',
  '/api/recompetes',
  '/api/saved-searches',
  '/api/settings',
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => {
    if (prefix === '/') return pathname === '/';
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isLogin = pathname === '/login';
  const isProtectedPage = matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES);
  const isProtectedApi = matchesPrefix(pathname, PROTECTED_API_PREFIXES);

  if (!isLogin && !isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (isLogin && session) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (session) {
    return res;
  }

  if (isProtectedApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('redirect', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
