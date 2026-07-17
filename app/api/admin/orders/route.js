import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'
import { dispatchToBrandsurface, cancelScheduledSend } from '@/lib/dispatch'

export const dynamic = 'force-dynamic'

const back = (req, status) => NextResponse.redirect(new URL(`/admin?status=${status}`, req.url), 303)

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const action = String(form.get('action') || '')

  if (action === 'bulk-delete') {
    const ids = form.getAll('ids').map(String).filter(Boolean)
    if (!ids.length) return back(req, 'error')
    const { data: list } = await supabase.from('orders').select('*').in('id', ids)
    for (const o of list || []) {
      await cancelScheduledSend(o)
      if (Array.isArray(o.uploads) && o.uploads.length) {
        try { await supabase.storage.from('order-uploads').remove(o.uploads.map(u => u.path)) } catch (e) { console.warn('Kunne ikke slette filer:', e?.message) }
      }
    }
    const { error } = await supabase.from('orders').delete().in('id', ids)
    return back(req, error ? 'error' : 'deleted')
  }

  const id = String(form.get('id') || '')
  if (!id) return back(req, 'error')

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single()
  if (!order) return back(req, 'notfound')

  if (action === 'set-pm-status') {
    const valid = ['not_handled', 'quote_approval', 'awaiting_info', 'taken_further', 'completed']
    const raw = String(form.get('pm_status') || '')
    const val = valid.includes(raw) ? raw : null
    const { error } = await supabase.from('orders').update({ pm_status: val }).eq('id', id)
    return error ? back(req, 'error') : NextResponse.redirect(new URL('/admin', req.url), 303)
  }

  if (action === 'approve') {
    if (order.status !== 'pending') return back(req, 'notpending')
    await dispatchToBrandsurface(order)
    return back(req, 'approved')
  }

  if (action === 'delete') {
    await cancelScheduledSend(order)
    if (Array.isArray(order.uploads) && order.uploads.length) {
      try { await supabase.storage.from('order-uploads').remove(order.uploads.map(u => u.path)) } catch (e) { console.warn('Kunne ikke slette filer:', e?.message) }
    }
    const { error } = await supabase.from('orders').delete().eq('id', id)
    return back(req, error ? 'error' : 'deleted')
  }

  return back(req, 'error')
}
