import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createSessionToken } from '@/lib/session'
import { CUSTOMER_COOKIE, timingSafeEqualStr } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const MAX_ATTEMPTS = 5

function redirect(req, path) {
  return NextResponse.redirect(new URL(path, req.url), 303)
}

// Only honour same-site relative paths; never /admin.
function safeNext(raw) {
  if (typeof raw !== 'string') return '/mine-ordrer'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/admin')) return '/mine-ordrer'
  return raw
}

export async function POST(req) {
  const secret = process.env.CUSTOMER_SESSION_SECRET
  if (!secret) return redirect(req, '/verificer?error=server')

  const form = await req.formData()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const code = String(form.get('code') || '').trim()
  const next = safeNext(form.get('next'))
  const back = (err) => '/verificer?email=' + encodeURIComponent(email) + '&error=' + err

  const { data: row } = await supabase
    .from('customers')
    .select('id, email, email_verified, verify_code, verify_expires, verify_attempts')
    .eq('email', email)
    .maybeSingle()

  // Generic failure — never reveal whether the email exists.
  if (!row || !row.verify_code) return redirect(req, back('invalid'))

  if (row.email_verified) {
    // Already verified — just log them in if the code still matches, else send to login.
    return redirect(req, '/login?notice=exists')
  }
  if ((row.verify_attempts || 0) >= MAX_ATTEMPTS) return redirect(req, back('locked'))
  if (!row.verify_expires || new Date(row.verify_expires).getTime() < Date.now()) {
    return redirect(req, back('expired'))
  }
  if (!timingSafeEqualStr(code, row.verify_code)) {
    await supabase.from('customers').update({ verify_attempts: (row.verify_attempts || 0) + 1 }).eq('id', row.id)
    return redirect(req, back('invalid'))
  }

  // Success — mark verified, clear the code, open a session.
  await supabase
    .from('customers')
    .update({ email_verified: true, verify_code: null, verify_expires: null, verify_attempts: 0 })
    .eq('id', row.id)

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
