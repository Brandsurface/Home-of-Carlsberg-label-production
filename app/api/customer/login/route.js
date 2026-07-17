import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword, verifyPassword } from '@/lib/admin-auth'
import { createSessionToken } from '@/lib/session'
import { CUSTOMER_COOKIE } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
// Precomputed once: used to keep response timing constant on unknown emails.
const DUMMY_HASH = hashPassword('timing-parity-placeholder')

function redirect(req, path) {
  return NextResponse.redirect(new URL(path, req.url), 303)
}
function safeNext(raw) {
  if (typeof raw !== 'string') return '/mine-ordrer'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/admin')) return '/mine-ordrer'
  return raw
}

export async function POST(req) {
  const secret = process.env.CUSTOMER_SESSION_SECRET
  if (!secret) return redirect(req, '/login?error=config')

  const form = await req.formData()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '')
  const next = safeNext(form.get('next'))

  const { data: row } = await supabase
    .from('customers')
    .select('id, email, password_hash, email_verified')
    .eq('email', email)
    .maybeSingle()

  // Unknown email: still run a hash compare so timing matches the real path.
  if (!row || !row.password_hash) {
    verifyPassword(password, DUMMY_HASH)
    return redirect(req, '/login?error=invalid')
  }
  if (!verifyPassword(password, row.password_hash)) {
    return redirect(req, '/login?error=invalid')
  }
  if (!row.email_verified) {
    return redirect(req, '/verificer?email=' + encodeURIComponent(email) + '&notice=verify')
  }

  const token = await createSessionToken({ uid: row.id, email: row.email }, secret, SESSION_MAX_AGE)
  const res = redirect(req, next)
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
