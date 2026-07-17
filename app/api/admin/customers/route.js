import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, hashPassword } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const back = (req, status) => NextResponse.redirect(new URL(`/admin/customers?status=${status}`, req.url), 303)

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const action = String(form.get('action') || '')

  if (action === 'create') {
    const email = String(form.get('email') || '').trim().toLowerCase()
    const password = String(form.get('password') || '')
    if (!EMAIL_RE.test(email) || password.length < 8) return back(req, 'invalid')
    const { error } = await supabase.from('customers').insert({
      email,
      password_hash: hashPassword(password),
      email_verified: true,
    })
    return back(req, error ? (error.code === '23505' ? 'exists' : 'error') : 'created')
  }

  if (action === 'update') {
    const id = String(form.get('id') || '')
    const email = String(form.get('email') || '').trim().toLowerCase()
    if (!id || !EMAIL_RE.test(email)) return back(req, 'invalid')
    const { error } = await supabase.from('customers').update({ email }).eq('id', id)
    return back(req, error ? (error.code === '23505' ? 'exists' : 'error') : 'updated')
  }

  if (action === 'reset') {
    const id = String(form.get('id') || '')
    const password = String(form.get('password') || '')
    if (!id || password.length < 8) return back(req, 'invalid')
    const { error } = await supabase.from('customers').update({ password_hash: hashPassword(password) }).eq('id', id)
    return back(req, error ? 'error' : 'reset')
  }

  if (action === 'delete') {
    const id = String(form.get('id') || '')
    if (!id) return back(req, 'error')
    const { error } = await supabase.from('customers').delete().eq('id', id)
    return back(req, error ? 'error' : 'deleted')
  }

  return back(req, 'error')
}
