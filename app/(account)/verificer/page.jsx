import { cookies } from 'next/headers'
import { translations } from '@/lib/translations'
import AuthShell, { Banner, Field, inputStyle, btnPrimaryStyle } from '../AuthShell'

export const dynamic = 'force-dynamic'

export default async function CustomerVerify({ searchParams }) {
  const lang = (await cookies()).get('lang')?.value === 'da' ? 'da' : 'en'
  const t = translations[lang]

  const email = typeof searchParams?.email === 'string' ? searchParams.email : ''
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '/mine-ordrer'

  const ERRORS = {
    invalid: t.cust_verify_err_invalid,
    expired: t.cust_verify_err_expired,
    locked: t.cust_verify_err_locked,
    server: t.cust_login_err_server,
  }
  const NOTICES = {
    sent: t.cust_verify_notice_sent,
    verify: t.cust_login_notice_verify,
  }
  const error = searchParams?.error ? (ERRORS[searchParams.error] || ERRORS.invalid) : null
  const notice = searchParams?.notice ? NOTICES[searchParams.notice] : null
  const sub = t.cust_verify_sub.replace('{email}', email || '—')

  return (
    <AuthShell title={t.cust_verify_title} sub={sub}>
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="notice">{notice}</Banner>}

      <form method="POST" action="/api/customer/verify" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <Field label={t.cust_verify_code_label}>
          <input name="code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required autoComplete="one-time-code"
            placeholder="••••••" style={{ ...inputStyle, letterSpacing: '0.4em', fontSize: 20, textAlign: 'center' }} />
        </Field>
        <button type="submit" style={btnPrimaryStyle}>{t.cust_verify_btn}</button>
      </form>

      <form method="POST" action="/api/customer/resend-code" style={{ marginTop: 16, textAlign: 'center' }}>
        <input type="hidden" name="email" value={email} />
        <button type="submit" style={{ background: 'none', border: 'none', color: '#9ed6b8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
          {t.cust_verify_resend}
        </button>
      </form>
    </AuthShell>
  )
}
