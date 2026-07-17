import { NextResponse } from 'next/server'
import { CUSTOMER_COOKIE } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const res = NextResponse.redirect(new URL('/login', req.url), 303)
  res.cookies.set(CUSTOMER_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
