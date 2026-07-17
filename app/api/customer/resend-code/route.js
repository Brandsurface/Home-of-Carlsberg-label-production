import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { genVerifyCode } from '@/lib/customer-auth'
import { buildVerifyEmail } from '@/lib/customer-emails'
import { sendEmail, hasMailKey } from '@/lib/brevo'

export const dynamic = 'force-dynamic'

const CODE_TTL_MS = 15 * 60 * 1000
const RESEND_THROTTLE_MS = 60 * 1000

function redirect(req, path) {
  return NextResponse.redirect(new URL(path, req.url), 303)
}

export async function POST(req) {
  const form = await req.formData()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const lang = req.cookies.get('lang')?.value === 'da' ? 'da' : 'en'
  // Always end on the verify page with a generic notice (non-enumerating).
  const done = '/verificer?email=' + encodeURIComponent(email) + '&notice=sent'

  try {
    const { data: row } = await supabase
      .from('customers')
      .select('id, email_verified, verify_sent_at')
      .eq('email', email)
      .maybeSingle()

    if (row && !row.email_verified && hasMailKey()) {
      const now = Date.now()
      const sentRecently = row.verify_sent_at && (now - new Date(row.verify_sent_at).getTime() < RESEND_THROTTLE_MS)
      if (!sentRecently) {
        const code = genVerifyCode()
        await supabase.from('customers').update({
          verify_code: code,
          verify_expires: new Date(now + CODE_TTL_MS).toISOString(),
          verify_sent_at: new Date(now).toISOString(),
          verify_attempts: 0,
        }).eq('id', row.id)
        const { subject, html } = buildVerifyEmail({ code, email, lang })
        await sendEmail({ to: email, senderName: 'Brandsurface', subject, html })
      }
    }
  } catch (e) {
    console.error('Resend-code fejl:', e?.message)
  }
  return redirect(req, done)
}
