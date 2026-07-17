import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

export const config = { matcher: ['/admin', '/admin/:path*'] }

export async function middleware(req) {
  const { pathname } = req.nextUrl

  // Login page is always reachable
  if (pathname === '/admin/login') return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = await verifySessionToken(token, process.env.ADMIN_SESSION_SECRET)

  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    if (pathname !== '/admin') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
