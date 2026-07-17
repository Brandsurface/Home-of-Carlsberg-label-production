import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/admin-auth'
import { genVerifyCode } from '@/lib/customer-auth'
import { buildVerifyEmail } from '@/lib/customer-emails'
import { sendEmail, hasMailKey } from '@/lib/brevo'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_TTL_MS = 15 * 60 * 1000
const RESEND_THROTTLE_MS = 60 * 1000

function redirect(req, path) {
  return NextResponse.redirect(new URL(path, req.url), 303)
}

async function sendCode(email, code, lang) {
  const { subject, html } = buildVerifyEmail({ code, email, lang })
  await sendEmail({ to: email, senderName: 'Brandsurface', subject, html })
}

export async function POST(req) {
  if (!process.env.CUSTOMER_SESSION_SECRET) return redirect(req, '/opret?error=server')
  if (!hasMailKey()) return redirect(req, '/opret?error=mail')

  const form = await req.formData()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '')
  const password2 = String(form.get('password2') || '')
  const lang = req.cookies.get('lang')?.value === 'da' ? 'da' : 'en'

  if (!EMAIL_RE.test(email) || password.length < 8 || password !== password2) {
    return redirect(req, '/opret?error=invalid')
  }

  try {
    const { data: existing } = await supabase
      .from('customers')
      .select('id, email_verified, verify_sent_at')
      .eq('email', email)
      .maybeSingle()

    const now = Date.now()
    const code = genVerifyCode()
    const verify_expires = new Date(now + CODE_TTL_MS).toISOString()

    if (existing) {
      // Don't reveal a verified account exists — send them to log in.
      if (existing.email_verified) return redirect(req, '/login?notice=exists')

      // Unverified: reset the password to what they just typed.
      const sentRecently = existing.verify_sent_at && (now - new Date(existing.verify_sent_at).getTime() < RESEND_THROTTLE_MS)
      const update = { password_hash: hashPassword(password), verify_attempts: 0 }
      if (!sentRecently) {
        update.verify_code = code
        update.verify_expires = verify_expires
        update.verify_sent_at = new Date(now).toISOString()
      }
      await supabase.from('customers').update(update).eq('id', existing.id)
      if (!sentRecently) await sendCode(email, code, lang)
      return redirect(req, '/verificer?email=' + encodeURIComponent(email))
    }

    // New account
    const { error } = await supabase.from('customers').insert({
      email,
      password_hash: hashPassword(password),
      email_verified: false,
      verify_code: code,
      verify_expires,
      verify_sent_at: new Date(now).toISOString(),
    })
    if (error) {
      console.error('Customer signup insert fejl:', error.message)
      return redirect(req, '/opret?error=server')
    }
    await sendCode(email, code, lang)
    return redirect(req, '/verificer?email=' + encodeURIComponent(email))
  } catch (e) {
    console.error('Customer signup fejl:', e?.message)
    return redirect(req, '/opret?error=mail')
  }
}
