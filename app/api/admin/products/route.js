import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const back = (req, status) => NextResponse.redirect(new URL(`/admin/products?status=${status}`, req.url), 303)

// Parse a JSON array of strings from a hidden ListBuilder input.
function parseStringArray(raw) {
  const str = String(raw || '').trim()
  if (!str) return []
  try {
    const arr = JSON.parse(str)
    if (Array.isArray(arr)) return arr.map(v => String(v).trim()).filter(Boolean)
  } catch {}
  return []
}

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const action = String(form.get('action') || '')

  // ── Brands ──
  if (action === 'create-brand' || action === 'update-brand') {
    const name = String(form.get('name') || '').trim()
    if (!name) return back(req, 'brand-invalid')
    const variants = parseStringArray(form.get('variants'))
    const sort = parseInt(form.get('sort'), 10) || 0

    if (action === 'create-brand') {
      const { error } = await supabase.from('brands').insert({ name, variants, sort, active: true })
      return back(req, error ? 'error' : 'brand-created')
    }
    const id = String(form.get('id') || '')
    if (!id) return back(req, 'error')
    const { error } = await supabase.from('brands')
      .update({ name, variants, sort, active: form.get('active') === 'on' })
      .eq('id', id)
    return back(req, error ? 'error' : 'brand-saved')
  }

  if (action === 'delete-brand') {
    const id = String(form.get('id') || '')
    const { error } = await supabase.from('brands').delete().eq('id', id)
    return back(req, error ? 'error' : 'brand-deleted')
  }

  // ── Option lists ──
  if (action === 'save-options') {
    const now = new Date().toISOString()
    const rows = [
      { key: 'sizes', value: JSON.stringify(parseStringArray(form.get('sizes'))), updated_at: now },
      { key: 'regions', value: JSON.stringify(parseStringArray(form.get('regions'))), updated_at: now },
      { key: 'pantmaerke_exempt_region', value: String(form.get('pantmaerke_exempt_region') || '').trim(), updated_at: now },
    ]
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' })
    return back(req, error ? 'error' : 'opts-saved')
  }

  return back(req, 'error')
}
