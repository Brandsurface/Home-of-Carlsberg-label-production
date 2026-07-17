// Brevo (ex-Sendinblue) transactional email — replaces Resend.
// EU-hosted. Supports native scheduled sends (scheduledAt, up to 72h) and
// cancelling them by batchId, which is exactly what the grace-period flow needs.
//
// Docs:
//   POST   https://api.brevo.com/v3/smtp/email                 (send / schedule)
//   DELETE https://api.brevo.com/v3/smtp/email/{batchId}       (cancel scheduled)

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

export function hasMailKey() {
  return !!process.env.BREVO_API_KEY
}

function defaultSender() {
  return {
    email: process.env.SENDER_EMAIL || 'no-reply@brandsurface.dk',
    name: process.env.SENDER_NAME || 'Brandsurface',
  }
}

// Send a transactional email. Provide `scheduledAt` (Date|string) + `batchId`
// (UUIDv4) to schedule it for later. Returns { messageId, batchId }.
export async function sendEmail({ to, subject, html, replyTo, senderName, scheduledAt, batchId }) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY mangler')

  const sender = defaultSender()
  const body = {
    sender: { email: sender.email, name: senderName || sender.name },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  }
  if (replyTo) body.replyTo = { email: replyTo }
  if (scheduledAt) {
    body.scheduledAt = new Date(scheduledAt).toISOString()
    body.batchId = batchId
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${data?.message || data?.code || 'send failed'}`)
  }
  return { messageId: data.messageId || null, batchId: batchId || null }
}

// Cancel a scheduled send by its batchId (or messageId). Never throws.
export async function cancelScheduled(identifier) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey || !identifier) return
  try {
    await fetch(`${BREVO_URL}/${encodeURIComponent(identifier)}`, {
      method: 'DELETE',
      headers: { 'api-key': apiKey, accept: 'application/json' },
    })
  } catch (e) {
    console.warn('Kunne ikke annullere planlagt Brevo-mail:', e?.message)
  }
}
