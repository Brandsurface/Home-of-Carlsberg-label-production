// MailerSend transactional email — replaces Resend.
// Supports native scheduled sends (send_at) and cancelling them by the
// message id MailerSend returns, which is exactly what the grace-period flow
// needs.
//
// Docs:
//   POST   https://api.mailersend.com/v1/email                   (send / schedule)
//   DELETE https://api.mailersend.com/v1/message-schedules/{id}  (cancel scheduled)
//
// Sender: SENDER_EMAIL must be an address on a domain verified in MailerSend
// — unlike Resend there is no shared test sender to fall back to, so both
// MAILERSEND_API_KEY and SENDER_EMAIL are required before mail is attempted.
//
// Note: MailerSend only allows cancelling a scheduled message up to 10
// minutes before it's due to send. cancelScheduled() never throws, so a
// last-minute cancel attempt just silently fails to stop the send — same
// "never block the caller on a mail failure" contract as before.

const MAILERSEND_URL = 'https://api.mailersend.com/v1/email'
const SCHEDULES_URL = 'https://api.mailersend.com/v1/message-schedules'
const DEFAULT_SENDER_NAME = 'Ordre'

export function hasMailKey() {
  return !!process.env.MAILERSEND_API_KEY && !!process.env.SENDER_EMAIL
}

// SENDER_NAME, when set, wins over the per-call senderName so the whole flow
// can be re-labelled from the environment without touching code.
function fromField(senderName) {
  const name = process.env.SENDER_NAME || senderName || DEFAULT_SENDER_NAME
  return { email: process.env.SENDER_EMAIL, name }
}

// Send a transactional email. Provide `scheduledAt` (Date|string) to schedule
// it for later (MailerSend allows up to 72 hours ahead). Returns { id } —
// store it to be able to cancel the send.
export async function sendEmail({ to, subject, html, replyTo, senderName, scheduledAt }) {
  const apiKey = process.env.MAILERSEND_API_KEY
  if (!apiKey) throw new Error('MAILERSEND_API_KEY mangler')
  if (!process.env.SENDER_EMAIL) throw new Error('SENDER_EMAIL mangler')

  const body = {
    from: fromField(senderName),
    to: [{ email: to }],
    subject,
    html,
  }
  if (replyTo) body.reply_to = { email: replyTo }
  if (scheduledAt) body.send_at = Math.floor(new Date(scheduledAt).getTime() / 1000)

  const res = await fetch(MAILERSEND_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`MailerSend ${res.status}: ${data?.message || 'send failed'}`)
  }
  return { id: res.headers.get('x-message-id') }
}

// Cancel a scheduled send by the id returned from sendEmail. Never throws.
export async function cancelScheduled(id) {
  const apiKey = process.env.MAILERSEND_API_KEY
  if (!apiKey || !id) return
  try {
    await fetch(`${SCHEDULES_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${apiKey}` },
    })
  } catch (e) {
    console.warn('Kunne ikke annullere planlagt MailerSend-mail:', e?.message)
  }
}
