import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page and auth API through
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const session = await decrypt(req.cookies.get('session')?.value);

  if (!session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
