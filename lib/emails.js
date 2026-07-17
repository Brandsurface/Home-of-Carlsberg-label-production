import { translations } from './translations.js'

// ── Mail template helpers ─────────────────────────────────────

const FONT_SANS = "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const FONT_MONO = "'DM Mono','SFMono-Regular',Menlo,Consolas,monospace"
const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet"/>'
const BG = 'linear-gradient(160deg,#16231c 0%,#0b120e 55%)'
const CARD_BG = '#16211b'
const CARD_BORDER = '#33453b'

function escapeHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
function escapeMultiline(text) {
  return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>')
}
// Render the rich ingredients value: keep only bold, neutralise stray tags, \n → <br>.
function renderRich(stored) {
  const s = String(stored == null ? '' : stored)
  const re = /<\s*(\/?)\s*(b|strong)\s*>/gi
  let out = '', last = 0, m
  while ((m = re.exec(s)) !== null) {
    out += s.slice(last, m.index).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    out += m[1] ? '</strong>' : '<strong style="font-weight:700;color:#9ed6b8;">'
    last = re.lastIndex
  }
  out += s.slice(last).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return out.replace(/\r\n|\r|\n/g, '<br>')
}
function extractBoldList(stored) {
  const out = []
  const re = /<\s*(b|strong)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi
  let m
  while ((m = re.exec(String(stored || ''))) !== null) {
    const t = m[2].replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&')
      .trim()
    if (t) out.push(t)
  }
  return out.filter((v, i) => out.indexOf(v) === i)
}

function logo(size = 26) {
  return `<span style="font-family:${FONT_SANS};font-size:${size}px;font-weight:800;letter-spacing:0.02em;color:#f1562e;">BRANDSURFACE</span>`
}
function sectionLabel(text) {
  return `<p style="margin:0 0 12px;font-family:${FONT_MONO};font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#7d8c82;">${text}</p>`
}
function getT(order) {
  const lang = (order && order.language === 'da') ? 'da' : 'en'
  return translations[lang]
}

// Build a card of label/value rows for a list of [label, value] pairs.
// Empty values are skipped.
function specCard(rows) {
  const cells = rows
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([label, value, opts]) => {
      const val = opts && opts.rich ? renderRich(value) : opts && opts.pre ? escapeMultiline(value) : escapeHtml(value)
      return `<tr>
        <td style="padding:10px 14px;border-top:1px solid ${CARD_BORDER};font-family:${FONT_MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7d8c82;white-space:nowrap;vertical-align:top;width:1%;">${escapeHtml(label)}</td>
        <td style="padding:10px 14px 10px 0;border-top:1px solid ${CARD_BORDER};font-size:13px;color:#eef2ee;line-height:1.5;">${val}</td>
      </tr>`
    })
    .join('')
  if (!cells) return ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:14px;overflow:hidden;">
    <tr><td colspan="2" style="height:6px;"></td></tr>${cells}<tr><td colspan="2" style="height:6px;"></td></tr></table>`
}

// Free-text note card (e.g. additional information).
function noteCard(text) {
  if (!text || !String(text).trim()) return ''
  return `<div style="background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:14px;padding:16px 18px;">
    <p style="margin:0;font-size:14px;color:#eef2ee;line-height:1.7;">${escapeMultiline(text)}</p>
  </div>`
}

function isBorder(region) {
  return String(region || '').trim().toLowerCase() === 'border'
}

// Upload categories, in display order, with their label translation keys + fallbacks.
const UPLOAD_SLOT_ORDER = ['cutterguide', 'ingredients', 'additional', 'artwork']
const UPLOAD_SLOT_KEY = { cutterguide: 'upload_cat_cutterguide', ingredients: 'upload_cat_ingredients', additional: 'upload_cat_additional', artwork: 'upload_cat_artwork' }
const UPLOAD_SLOT_FALLBACK = { cutterguide: 'Cutterguide', ingredients: 'Ingredients & nutrition', additional: 'Additional information', artwork: 'Artwork' }
function uploadCatLabel(slot, t) {
  return (t && t[UPLOAD_SLOT_KEY[slot]]) || UPLOAD_SLOT_FALLBACK[slot]
}
// Group a list of uploaded files/links under their slot, keeping the slot order.
function groupUploadsBySlot(files) {
  const list = Array.isArray(files) ? files : []
  return UPLOAD_SLOT_ORDER
    .map(slot => ({ slot, files: list.filter(f => (UPLOAD_SLOT_ORDER.includes(f.slot) ? f.slot : 'artwork') === slot) }))
    .filter(g => g.files.length)
}
// Render grouped uploads as category-labelled blocks. `renderItem` turns one file into HTML.
function uploadGroupsHtml(files, t, renderItem) {
  return groupUploadsBySlot(files).map(g => `
        <p style="margin:0 0 3px;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7d8c82;">${escapeHtml(uploadCatLabel(g.slot, t))}</p>
        <p style="margin:0 0 12px;color:#aebdb3;font-size:13px;line-height:1.8;">${g.files.map(renderItem).join('<br>')}</p>`).join('')
}

function energyText(order) {
  const kj = order.energy_kj != null && String(order.energy_kj).trim() !== '' ? String(order.energy_kj).trim() + ' kJ' : ''
  const kcal = order.energy_kcal != null && String(order.energy_kcal).trim() !== '' ? String(order.energy_kcal).trim() + ' kcal' : ''
  return [kj, kcal].filter(Boolean).join(' / ')
}
function canRows(order, t) {
  return [
    [t.f_brand, order.brand],
    [t.f_variant, order.variant],
    [t.f_size, order.size],
    [t.f_region, order.region],
    [t.f_label_type, order.label_type],
    [t.f_paper, order.paper],
    [t.f_finish, order.finish],
    [t.f_energy, energyText(order)],
    [t.f_units, order.units],
    [t.f_cutterguide, order.cutterguide],
  ]
}
function productionRows(order, t) {
  const rows = [
    [t.f_material_old, order.material_old],
    [t.f_material_new, order.material_new],
    [t.f_ean, order.ean],
  ]
  if (!isBorder(order.region)) rows.push([t.f_pantmaerke, order.pantmaerke ? t.rv_yes : t.rv_no])
  if (order.ingredients) {
    rows.push([t.f_ingredients, order.ingredients, { rich: true }])
    const marks = extractBoldList(order.ingredients)
    if (marks.length) rows.push([t.f_ingredients_marked, marks.join(', ')])
  }
  return rows
}

// ── Customer email: auto-sends to Brandsurface after a delay ──
export function buildCustomerConfirmEmail({ order, baseUrl, delayMinutes = 10 }) {
  const t = getT(order)
  const editUrl = `${baseUrl}/?edit=${order.id}`
  const dateLocale = t.email_date_locale || 'en-GB'

  const ordererRows = [
    [t.f_campaign, order.butiksnavn],
    [t.f_name, order.navn],
    [t.f_email, order.email],
    [t.f_deadline, order.delivery_date ? new Date(order.delivery_date).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : ''],
  ]

  const artworkExtras = []
  if (order.artwork_help) artworkExtras.push([t.f_artwork, t.rv_help_requested])
  if (order.smash_link) artworkExtras.push([t.f_smash, t.rv_smash_requested])

  const revisionNote = order.revision > 0
    ? `<tr><td style="padding-bottom:24px;">
        <div style="padding:12px 16px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:12px;color:#f87171;font-size:13px;line-height:1.5;">
          ${t.email_cust_revision.replace('{n}', order.revision)}
        </div>
      </td></tr>`
    : ''

  const subject = order.revision > 0
    ? t.email_cust_subject_rev.replace('{campaign}', order.butiksnavn).replace('{n}', order.revision)
    : t.email_cust_subject.replace('{campaign}', order.butiksnavn)

  const greeting = t.email_cust_greeting
    .replace('{name}', escapeHtml(order.navn))
    .replace('{campaign}', escapeHtml(order.butiksnavn))

  const autoSendText = t.email_auto_send.replace('{n}', delayMinutes)

  const section = (label, card) => card ? `<tr><td style="padding-bottom:26px;">${sectionLabel(label)}${card}</td></tr>` : ''

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="${order.language || 'en'}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${t.email_cust_heading}</title>${FONT_LINK}</head>
<body style="margin:0;padding:0;background:#0b120e;font-family:${FONT_SANS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
  <tr><td align="center" style="padding:44px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr><td style="padding-bottom:32px;">${logo(26)}</td></tr>
      <tr><td style="padding-bottom:8px;">
        <h1 style="margin:0;font-size:30px;font-weight:800;letter-spacing:-0.03em;color:#f1562e;line-height:1.05;">${t.email_cust_heading}</h1>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#aebdb3;line-height:1.6;font-weight:300;">${greeting}</p>
      </td></tr>

      ${revisionNote}

      ${section(t.review_orderer, specCard(ordererRows))}
      ${section(t.review_can, specCard(canRows(order, t)))}
      ${section(t.review_production, specCard(productionRows(order, t)))}
      ${section(t.review_additional, noteCard(order.andet))}
      ${section(t.review_artwork_section, specCard(artworkExtras))}

      ${(order.uploads && order.uploads.length) ? `<tr><td style="padding-bottom:26px;">
        ${sectionLabel(t.email_files)}
        ${uploadGroupsHtml(order.uploads, t, f => escapeHtml(f.name))}
      </td></tr>` : ''}

      <tr><td style="padding-bottom:24px;">
        <div style="background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:14px;padding:16px 18px;">
          <p style="margin:0 0 14px;font-size:14px;color:#aebdb3;line-height:1.6;">${autoSendText}</p>
          <p style="margin:0 0 16px;font-size:14px;color:#aebdb3;line-height:1.6;">${t.email_edit_hint}</p>
          <a href="${editUrl}" style="display:inline-block;padding:13px 26px;background:#f1562e;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px;">${t.email_edit_btn}</a>
        </div>
      </td></tr>

      <tr><td style="border-top:1px solid ${CARD_BORDER};padding-top:20px;">
        <p style="margin:0;font-size:11px;color:#5f6e64;line-height:1.6;">
          ${t.email_footer}<br>
          ${t.email_order_id} <code style="color:#7d8c82;font-family:${FONT_MONO};">${order.id}</code>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
  }
}

// ── Email to Brandsurface when the customer has approved ──────
export function buildBrandsurfaceEmail({ order, baseUrl }) {
  baseUrl = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://brandsurface.dk'
  const t = getT(order)
  const dateLocale = t.email_date_locale || 'en-GB'

  const ordererRows = [
    [t.f_campaign, order.butiksnavn],
    [t.f_name, order.navn],
    [t.f_email, order.email],
    [t.f_deadline, order.delivery_date ? new Date(order.delivery_date).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : ''],
    [t.email_revision.replace(':', ''), order.revision > 0 ? String(order.revision) : ''],
  ]

  const artworkExtras = []
  if (order.artwork_help) artworkExtras.push([t.f_artwork, t.rv_help_requested])
  if (order.smash_link) artworkExtras.push([t.f_smash, t.rv_smash_requested])

  const section = (label, card) => card ? `<tr><td style="padding-bottom:20px;">${sectionLabel(label)}${card}</td></tr>` : ''

  return {
    subject: t.email_bs_subject.replace('{campaign}', order.butiksnavn),
    html: `<!DOCTYPE html>
<html lang="${order.language || 'en'}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>${FONT_LINK}</head>
<body style="margin:0;padding:0;background:#0b120e;font-family:${FONT_SANS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
  <tr><td align="center" style="padding:44px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr><td style="padding-bottom:28px;">${logo(22)}</td></tr>
      <tr><td style="padding-bottom:6px;">
        <h1 style="margin:0;color:#f1562e;font-size:26px;font-weight:800;letter-spacing:-0.02em;">${t.email_bs_heading}</h1>
      </td></tr>
      <tr><td style="padding-bottom:26px;">
        <p style="margin:0;color:#aebdb3;font-size:14px;line-height:1.6;">${t.email_bs_intro}</p>
      </td></tr>

      ${section(t.review_orderer, specCard(ordererRows))}
      ${section(t.review_can, specCard(canRows(order, t)))}
      ${section(t.review_production, specCard(productionRows(order, t)))}
      ${section(t.review_additional, noteCard(order.andet))}
      ${section(t.review_artwork_section, specCard(artworkExtras))}

      ${(order.uploadLinks && order.uploadLinks.length) ? `<tr><td style="padding-bottom:20px;">
        ${sectionLabel(t.email_files)}
        ${uploadGroupsHtml(order.uploadLinks, t, f => `<a href="${f.url}" style="color:#f1562e;">${escapeHtml(f.name)}</a>`)}
        <p style="margin:6px 0 0;font-size:11px;color:#5f6e64;">${t.email_download_expiry}</p>
      </td></tr>` : ''}

      <tr><td style="border-top:1px solid ${CARD_BORDER};padding-top:18px;">
        <p style="margin:0;font-size:11px;color:#5f6e64;">${t.email_order_id} <code style="font-family:${FONT_MONO};">${order.id}</code></p>
        <p style="margin:10px 0 0;font-size:12px;">
          <a href="${baseUrl}/api/order-text?id=${order.id}" style="color:#7d8c82;text-decoration:underline;">⬇ Download plain text (.txt)</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
  }
}
