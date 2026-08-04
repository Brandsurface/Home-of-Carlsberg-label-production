import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'
import { BG_KEYS, normalizeBg } from '@/lib/background'

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
  const HEX_RE = /^#[0-9a-fA-F]{6}$/
  const heroTitleColorRaw = String(form.get('hero_title_color') || '').trim()
  const heroSubColorRaw = String(form.get('hero_sub_color') || '').trim()
  const heroTitleColor = HEX_RE.test(heroTitleColorRaw) ? heroTitleColorRaw : ''
  const heroSubColor = HEX_RE.test(heroSubColorRaw) ? heroSubColorRaw : ''

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

  // Background appearance — normalised on the way in so only values the
  // public page will actually render can reach the database.
  const bg = normalizeBg(Object.fromEntries(BG_KEYS.map(k => [k, form.get(k)])))
  const bgRows = [
    ['bg_gradient_from', bg.from],
    ['bg_gradient_to', bg.to],
    ['bg_gradient_angle', String(bg.angle)],
    ['bg_image_url', bg.imageUrl],
    ['bg_image_opacity', String(bg.imageOpacity)],
    ['bg_overlay', bg.overlay],
    ['bg_overlay_color', bg.overlayColor],
    ['bg_overlay_opacity', String(bg.overlayOpacity)],
  ]

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
      { key: 'hero_title_color', value: heroTitleColor, updated_at: now },
      { key: 'hero_sub_color', value: heroSubColor, updated_at: now },
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

  const { error: e4 } = await supabase
    .from('app_settings')
    .upsert(bgRows.map(([key, value]) => ({ key, value, updated_at: now })), { onConflict: 'key' })

  const error = e1 || e2 || e3 || e4
  if (error) console.error('[settings] upsert error:', error.message)
  const status = error ? 'error' : 'saved'
  return NextResponse.redirect(new URL(`/admin/settings?status=${status}`, req.url), 303)
}
