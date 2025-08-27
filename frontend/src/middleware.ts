import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // If accessing dashboard without being authenticated, redirect to login
  if (pathname.startsWith('/dashboard')) {
    // This will be handled client-side by the AuthProvider
    return NextResponse.next()
  }

  // If accessing login while authenticated, redirect to dashboard
  if (pathname === '/login') {
    // This will be handled client-side by the AuthProvider
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}
