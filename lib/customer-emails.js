import { translations } from './translations.js'

// ── Customer verification email ──────────────────────────────
// Self-contained styling (mirrors lib/emails.js' dark Brandsurface theme).

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
function logo() {
  return `<span style="font-family:${FONT_SANS};font-size:26px;font-weight:800;letter-spacing:0.02em;color:#f1562e;">BRANDSURFACE</span>`
}

// Build the verification email. Returns { subject, html }.
export function buildVerifyEmail({ code, email, lang = 'en' }) {
  const t = translations[lang === 'da' ? 'da' : 'en']
  const subject = t.email_verify_subject

  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>${FONT_LINK}</head>
<body style="margin:0;padding:0;background:${BG};background-color:#0b120e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};background-color:#0b120e;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:8px 4px 24px;">${logo()}</td></tr>
      <tr><td style="background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:16px;padding:32px 30px;">
        <h1 style="margin:0 0 10px;font-family:${FONT_SANS};font-size:22px;font-weight:800;letter-spacing:-0.01em;color:#eef2ee;">${escapeHtml(t.email_verify_heading)}</h1>
        <p style="margin:0 0 22px;font-family:${FONT_SANS};font-size:14px;line-height:1.6;color:#aebdb3;">${escapeHtml(t.email_verify_intro)}</p>
        <div style="background:#0b120e;border:1px solid ${CARD_BORDER};border-radius:12px;padding:20px;text-align:center;">
          <p style="margin:0 0 8px;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#7d8c82;">${escapeHtml(t.email_verify_code_label)}</p>
          <p style="margin:0;font-family:${FONT_MONO};font-size:34px;font-weight:500;letter-spacing:0.32em;color:#9ed6b8;">${escapeHtml(code)}</p>
        </div>
        <p style="margin:22px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:#7d8c82;">${escapeHtml(t.email_verify_expiry)}</p>
      </td></tr>
      <tr><td style="padding:20px 4px;font-family:${FONT_SANS};font-size:11px;line-height:1.6;color:#5d6b62;">${escapeHtml(t.email_footer)}</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

  return { subject, html }
}
