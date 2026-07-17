import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303)
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
