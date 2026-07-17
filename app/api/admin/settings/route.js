import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', req.url), 303)

  const form = await req.formData()
  const email = String(form.get('brandsurface_email') || '').trim()
  const delayRaw = parseInt(String(form.get('confirm_delay_minutes') || ''), 10)
  const delay = Number.isFinite(delayRaw) && delayRaw >= 0 ? delayRaw : 10
  const helpActive = form.get('help_box_active') === '1' ? '1' : '0'
  const helpHtml = String(form.get('help_box_html') || '').trim()

  const heroTitleEn = String(form.get('hero_title_en') || '').trim()
  const heroTitleDa = String(form.get('hero_title_da') || '').trim()
  const heroSubEn = String(form.get('hero_sub_en') || '').trim()
  const heroSubDa = String(form.get('hero_sub_da') || '').trim()

  const opKeys = ['label', 'sub',
    'step1_title', 'step1_p', 'step2_title', 'step2_p',
    'step3_title', 'step3_p', 'step4_title', 'step4_p']
  const opValues = {}
  for (const k of opKeys) {
    opValues[`op_${k}_en`] = String(form.get(`op_${k}_en`) || '').trim()
    opValues[`op_${k}_da`] = String(form.get(`op_${k}_da`) || '').trim()
  }

  const podioAppId = String(form.get('podio_app_id') || '').replace(/\D/g, '')
  const podioFieldJobNo = String(form.get('podio_field_job_no') || '').trim()
  const podioFieldJobName = String(form.get('podio_field_job_name') || '').trim()
  const podioFieldResp = String(form.get('podio_field_responsible') || '').trim()
  let podioEmployees = '[]'
  try {
    const parsed = JSON.parse(String(form.get('podio_employees') || '[]'))
    if (Array.isArray(parsed)) {
      podioEmployees = JSON.stringify(parsed
        .map(e => ({ name: String(e.name || '').trim(), podio_id: String(e.podio_id || '').trim() }))
        .filter(e => e.name))
    }
  } catch {}

  const now = new Date().toISOString()
  const { error: e1 } = await supabase
    .from('app_settings')
    .upsert([
      { key: 'brandsurface_email', value: email, updated_at: now },
      { key: 'confirm_delay_minutes', value: String(delay), updated_at: now },
    ], { onConflict: 'key' })

  const { error: e2 } = await supabase
    .from('app_settings')
    .upsert([
      { key: 'help_box_active', value: helpActive, updated_at: now },
      { key: 'help_box_html', value: helpHtml, updated_at: now },
      { key: 'hero_title_en', value: heroTitleEn, updated_at: now },
      { key: 'hero_title_da', value: heroTitleDa, updated_at: now },
      { key: 'hero_sub_en', value: heroSubEn, updated_at: now },
      { key: 'hero_sub_da', value: heroSubDa, updated_at: now },
      ...Object.entries(opValues).map(([key, value]) => ({ key, value, updated_at: now })),
    ], { onConflict: 'key' })

  const { error: e3 } = await supabase
    .from('app_settings')
    .upsert([
      { key: 'podio_app_id', value: podioAppId, updated_at: now },
      { key: 'podio_field_job_no', value: podioFieldJobNo, updated_at: now },
      { key: 'podio_field_job_name', value: podioFieldJobName, updated_at: now },
      { key: 'podio_field_responsible', value: podioFieldResp, updated_at: now },
      { key: 'podio_employees', value: podioEmployees, updated_at: now },
    ], { onConflict: 'key' })

  const error = e1 || e2 || e3
  if (error) console.error('[settings] upsert error:', error.message)
  const status = error ? 'error' : 'saved'
  return NextResponse.redirect(new URL(`/admin/settings?status=${status}`, req.url), 303)
}
