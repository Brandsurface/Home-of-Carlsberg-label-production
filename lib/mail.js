// Resend transactional email — replaces Brevo.
// Supports native scheduled sends (scheduled_at) and cancelling them by the
// email id Resend returns, which is exactly what the grace-period flow needs.
//
// Docs:
//   POST https://api.resend.com/emails              (send / schedule)
//   POST https://api.resend.com/emails/{id}/cancel  (cancel scheduled)
//
// Sender: set SENDER_EMAIL to an address on a domain verified in *this* Resend
// account. Without it we fall back to Resend's shared test sender
// (onboarding@resend.dev), which only delivers to the Resend account owner's
// own email address — fine for testing, not for live customer traffic.

const RESEND_URL = 'https://api.resend.com/emails'
const TEST_SENDER = 'onboarding@resend.dev'
const DEFAULT_SENDER_NAME = 'Ordre'

export function hasMailKey() {
  return !!process.env.RESEND_API_KEY
}

// SENDER_NAME, when set, wins over the per-call senderName so the whole flow
// can be re-labelled from the environment without touching code.
function fromHeader(senderName) {
  const email = process.env.SENDER_EMAIL || TEST_SENDER
  const name = process.env.SENDER_NAME || senderName || DEFAULT_SENDER_NAME
  return `${name} <${email}>`
}

// Send a transactional email. Provide `scheduledAt` (Date|string) to schedule
// it for later. Returns { id } — store it to be able to cancel the send.
export async function sendEmail({ to, subject, html, replyTo, senderName, scheduledAt }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY mangler')

  const body = {
    from: fromHeader(senderName),
    to: [to],
    subject,
    html,
  }
  if (replyTo) body.reply_to = replyTo
  if (scheduledAt) body.scheduled_at = new Date(scheduledAt).toISOString()

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${data?.message || data?.name || 'send failed'}`)
  }
  return { id: data.id || null }
}

// Cancel a scheduled send by the id returned from sendEmail. Never throws.
export async function cancelScheduled(id) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !id) return
  try {
    await fetch(`${RESEND_URL}/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    })
  } catch (e) {
    console.warn('Kunne ikke annullere planlagt Resend-mail:', e?.message)
  }
}
