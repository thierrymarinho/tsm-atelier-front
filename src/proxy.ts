import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Extract the tokens from the HttpOnly cookies
  // The backend sets these cookies upon successful login
  const token = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const { pathname } = request.nextUrl;

  // Define protected routes
  const isAccountRoute = pathname.startsWith('/account');
  const isCheckoutRoute = pathname.startsWith('/checkout');
  const isAdminRoute = pathname.startsWith('/admin');
  
  // Define public auth routes (should not be accessed if already logged in)
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Next.js App Router performs prefetching for <Link> components.
  // If we redirect during a prefetch, Next.js will automatically navigate the user's browser,
  // causing unwanted page reloads (e.g. when opening a drawer with protected Links).
  const isPrefetch = request.headers.get('next-router-prefetch') === '1' || request.headers.get('purpose') === 'prefetch';

  // We removed the aggressive redirect for protected routes here because if the backend 
  // scopes the `refresh_token` cookie to `Path=/api/v1/auth/refresh`, the middleware 
  // cannot see it. This caused the middleware to falsely redirect to '/' even when a valid 
  // refresh_token existed. The client-side AuthContext handles route protection perfectly.

  // If trying to access login/register while already logged in (has access_token), redirect to account
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to these specific paths to optimize edge execution
  matcher: [
    '/account/:path*', 
    '/checkout/:path*',
    '/admin/:path*',
    '/login',
    '/register'
  ],
};
