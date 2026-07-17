import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { translations } from '@/lib/translations'
import { getCustomerUser } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function parseList(value, fallback) {
  if (!value) return fallback
  try {
    const arr = JSON.parse(value)
    return Array.isArray(arr) ? arr.map(String) : fallback
  } catch {
    return fallback
  }
}

async function loadData(t) {
  let brands = []
  const settings = {}
  try {
    const [{ data: brandRows }, { data: settingRows }] = await Promise.all([
      supabase.from('brands').select('name, variants, active, sort').eq('active', true).order('sort', { ascending: true }),
      supabase.from('app_settings').select('key, value').in('key', [
        'sizes', 'regions', 'pantmaerke_exempt_region', 'help_box_active', 'help_box_html',
        'hero_title_en', 'hero_title_da', 'hero_sub_en', 'hero_sub_da',
        'op_label_en', 'op_label_da', 'op_sub_en', 'op_sub_da',
        'op_step1_title_en', 'op_step1_title_da', 'op_step1_p_en', 'op_step1_p_da',
        'op_step2_title_en', 'op_step2_title_da', 'op_step2_p_en', 'op_step2_p_da',
        'op_step3_title_en', 'op_step3_title_da', 'op_step3_p_en', 'op_step3_p_da',
        'op_step4_title_en', 'op_step4_title_da', 'op_step4_p_en', 'op_step4_p_da',
      ]),
    ])
    brands = brandRows || []
    for (const r of settingRows || []) settings[r.key] = r.value
  } catch (e) {
    console.error('Kunne ikke hente formular-data:', e?.message)
  }

  const sizes = parseList(settings.sizes, ['250 ml', '330 ml', '330 ml slim', '440 ml', '500 ml'])
  const regions = parseList(settings.regions, ['DK', 'Border'])
  const pantExempt = settings.pantmaerke_exempt_region || 'Border'

  // Print type, paper and finish are fixed in code. Finish applies to both print
  // types; paper only applies to Label.
  const labelTypes = ['Label', 'Can']
  const finishMap = {
    Label: ['Mat', 'Gloss', 'To be confirmed'],
    Can: ['Mat', 'Gloss', 'To be confirmed'],
  }
  const paperOpts = ['White', 'Metallic', 'Transparent', 'To be confirmed']

  // Brand tiles + variants map
  const variantsMap = {}
  let brandTiles = ''
  for (const b of brands) {
    const variants = Array.isArray(b.variants) ? b.variants : []
    variantsMap[b.name] = variants
    brandTiles += `<button type="button" class="brand-tile" data-brand="${esc(b.name)}" onclick="selectBrand(this)"><span class="brand-radio"></span><span class="brand-name">${esc(b.name)}</span></button>`
  }
  brandTiles += `<button type="button" class="brand-tile unknown" data-unknown="1" onclick="selectBrand(this)"><span class="brand-radio"></span><span class="brand-name">${esc(t.brand_unknown)}</span></button>`

  const sizeChips = sizes.map(s => `<button type="button" class="size-chip" data-size="${esc(s)}" onclick="selectSize(this)">${esc(s)}</button>`).join('')
  const regionSeg = regions.map((r, i) => `<button type="button" class="seg-btn${i === 0 ? ' selected' : ''}" data-region="${esc(r)}" onclick="selectRegion(this)">${esc(r)}</button>`).join('')
  const labelSeg = labelTypes.map((l, i) => `<button type="button" class="seg-btn${i === 0 ? ' selected' : ''}" data-labeltype="${esc(l)}" onclick="selectLabelType(this)">${esc(l)}</button>`).join('')
  // No finish pre-selected: a disabled placeholder + the default print type's options.
  const finishOpts = `<option value="" disabled selected hidden>${esc(t.finish_ph)}</option>` +
    (finishMap[labelTypes[0]] || []).map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('')
  // No paper pre-selected: a disabled placeholder + the paper options (Label only).
  const paperOptsHtml = `<option value="" disabled selected hidden>${esc(t.paper_ph)}</option>` +
    paperOpts.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const dataScript =
    `window.__VARIANTS=${JSON.stringify(variantsMap).replace(/</g, '\\u003c')};` +
    `window.__SUPABASE_URL=${JSON.stringify(supabaseUrl)};` +
    `window.__PANT_EXEMPT=${JSON.stringify(pantExempt)};` +
    `window.__FINISHES=${JSON.stringify(finishMap).replace(/</g, '\\u003c')};` +
    `window.__PAPERS=${JSON.stringify(paperOpts).replace(/</g, '\\u003c')};`

  const opKeys = [
    'op_label_en', 'op_label_da', 'op_sub_en', 'op_sub_da',
    'op_step1_title_en', 'op_step1_title_da', 'op_step1_p_en', 'op_step1_p_da',
    'op_step2_title_en', 'op_step2_title_da', 'op_step2_p_en', 'op_step2_p_da',
    'op_step3_title_en', 'op_step3_title_da', 'op_step3_p_en', 'op_step3_p_da',
    'op_step4_title_en', 'op_step4_title_da', 'op_step4_p_en', 'op_step4_p_da',
  ]
  const heroOverrides = {
    hero_title_en: settings.hero_title_en || '',
    hero_title_da: settings.hero_title_da || '',
    hero_sub_en: settings.hero_sub_en || '',
    hero_sub_da: settings.hero_sub_da || '',
  }
  for (const k of opKeys) heroOverrides[k] = settings[k] || ''

  return { brandTiles, sizeChips, regionSeg, labelSeg, finishOpts, paperOptsHtml, dataScript, helpBox: buildHelpBox(settings), heroOverrides }
}

function buildHelpBox(settings) {
  if (settings.help_box_active !== '1') return ''
  const content = settings.help_box_html || ''
  if (!content) return ''
  return `<div class="help-box">${content}</div>`
}

export default async function Home() {
  const lang = (await cookies()).get('lang')?.value === 'da' ? 'da' : 'en'
  const t = { ...translations[lang] }

  const filePath = path.join(process.cwd(), 'app', 'page.html')
  let html = fs.readFileSync(filePath, 'utf-8')

  const { brandTiles, sizeChips, regionSeg, labelSeg, finishOpts, paperOptsHtml, dataScript, helpBox, heroOverrides } = await loadData(t)

  if (heroOverrides.hero_title_en && lang === 'en') t.hero_title = heroOverrides.hero_title_en
  if (heroOverrides.hero_title_da && lang === 'da') t.hero_title = heroOverrides.hero_title_da
  if (heroOverrides.hero_sub_en && lang === 'en') t.hero_sub = heroOverrides.hero_sub_en
  if (heroOverrides.hero_sub_da && lang === 'da') t.hero_sub = heroOverrides.hero_sub_da

  const opMap = {
    order_process_label: [`op_label_en`, `op_label_da`],
    order_process_sub: [`op_sub_en`, `op_sub_da`],
    oh_step1_title: [`op_step1_title_en`, `op_step1_title_da`],
    oh_step1_p: [`op_step1_p_en`, `op_step1_p_da`],
    oh_step2_title: [`op_step2_title_en`, `op_step2_title_da`],
    oh_step2_p: [`op_step2_p_en`, `op_step2_p_da`],
    oh_step3_title: [`op_step3_title_en`, `op_step3_title_da`],
    oh_step3_p: [`op_step3_p_en`, `op_step3_p_da`],
    oh_step4_title: [`op_step4_title_en`, `op_step4_title_da`],
    oh_step4_p: [`op_step4_p_en`, `op_step4_p_da`],
  }
  for (const [tKey, [enKey, daKey]] of Object.entries(opMap)) {
    const val = lang === 'en' ? heroOverrides[enKey] : heroOverrides[daKey]
    if (val) t[tKey] = val
  }

  const me = await getCustomerUser()
  // When a customer is logged in, prefill name/email and pre-accept consent.
  // The customers table holds no name, so reuse the name from their latest order.
  let accountPrefill = null
  if (me) {
    let lastName = ''
    try {
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('navn')
        .ilike('email', me.email)
        .not('navn', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastName = lastOrder?.navn || ''
    } catch (e) {
      console.error('Kunne ikke hente kundenavn til prefill:', e?.message)
    }
    accountPrefill = { email: me.email, name: lastName }
  }
  const accountLink = me
    ? `<a class="account-link" href="/mine-ordrer">${esc(t.nav_my_orders)}</a>`
    : `<a class="account-link" href="/login">${esc(t.nav_login)}</a>` +
      `<a class="account-link account-link-primary" href="/opret">${esc(t.cust_signup_btn)}</a>`
  html = html.replace('<!--ACCOUNT_LINK-->', accountLink)

  html = html.replace('<!--BRAND_TILES-->', brandTiles)
  html = html.replace('<!--SIZE_CHIPS-->', sizeChips)
  html = html.replace('<!--REGION_SEG-->', regionSeg)
  html = html.replace('<!--LABELTYPE_SEG-->', labelSeg)
  html = html.replace('<!--FINISH_OPTIONS-->', finishOpts)
  html = html.replace('<!--PAPER_OPTIONS-->', paperOptsHtml)
  html = html.replace(/\s*<!--HELP_BOX-->/, helpBox)

  const tJson = JSON.stringify(t).replace(/</g, '\\u003c')
  const meJson = JSON.stringify(accountPrefill).replace(/</g, '\\u003c')
  html = html.replace('/*PRODUCTS_JSON*/', `${dataScript} window.__T=${tJson}; window.__LANG=${JSON.stringify(lang)}; window.__ME=${meJson};`)

  // Server-side translations — replace all {{key}} markers
  html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => t[key] ?? '')

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : html

  return <div dangerouslySetInnerHTML={{ __html: headContent + bodyContent }} />
}
