import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const back = (req, status) => NextResponse.redirect(new URL(`/admin/users?status=${status}`, req.url), 303)

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)
  if (!user.is_master) return back(req, 'forbidden')

  const form = await req.formData()
  const action = String(form.get('action') || '')

  if (action === 'create') {
    const email = String(form.get('email') || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back(req, 'invalid')
    // password_hash stays null → the user sets it on first login
    const { error } = await supabase.from('admin_users').insert({ email })
    return back(req, error ? (error.code === '23505' ? 'exists' : 'error') : 'created')
  }

  if (action === 'reset') {
    const id = String(form.get('id') || '')
    const { error } = await supabase.from('admin_users').update({ password_hash: null }).eq('id', id)
    return back(req, error ? 'error' : 'reset')
  }

  if (action === 'delete') {
    const id = String(form.get('id') || '')
    if (id === user.id) return back(req, 'self') // can't delete yourself
    const { data: target } = await supabase.from('admin_users').select('is_master').eq('id', id).single()
    if (target?.is_master) return back(req, 'master') // can't delete the master user
    const { error } = await supabase.from('admin_users').delete().eq('id', id)
    return back(req, error ? 'error' : 'deleted')
  }

  return back(req, 'error')
}
