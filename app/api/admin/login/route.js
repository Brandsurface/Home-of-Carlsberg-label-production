import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword, verifyPassword } from '@/lib/admin-auth'
import { SESSION_COOKIE, createSessionToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

function redirect(req, path) {
  return NextResponse.redirect(new URL(path, req.url), 303)
}

export async function POST(req) {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return redirect(req, '/admin/login?error=config')

  const form = await req.formData()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '')
  const nextRaw = String(form.get('next') || '/admin')
  const next = nextRaw.startsWith('/admin') ? nextRaw : '/admin'

  if (!email || !password) return redirect(req, '/admin/login?error=1')

  const { data: user } = await supabase
    .from('admin_users')
    .select('id, email, password_hash, is_master')
    .eq('email', email)
    .single()

  if (!user) return redirect(req, '/admin/login?error=1')

  if (!user.password_hash) {
    // First login: the password entered becomes this user's password
    const { error } = await supabase
      .from('admin_users')
      .update({ password_hash: hashPassword(password) })
      .eq('id', user.id)
    if (error) return redirect(req, '/admin/login?error=server')
  } else if (!verifyPassword(password, user.password_hash)) {
    return redirect(req, '/admin/login?error=1')
  }

  const token = await createSessionToken({ uid: user.id, email: user.email }, secret)
  const res = redirect(req, next)
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  return res
}
