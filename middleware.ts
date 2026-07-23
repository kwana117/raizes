import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const token = process.env.SESSION_TOKEN || 'dev-session-token-change-me';
  const authed = req.cookies.get('raizes_session')?.value === token;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/login')) {
    if (authed) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
