import { cookies } from 'next/headers'
import { translations } from '@/lib/translations'
import AuthShell, { Banner, Field, inputStyle, btnPrimaryStyle, linkStyle } from '../AuthShell'

export const dynamic = 'force-dynamic'

export default async function CustomerSignup({ searchParams }) {
  const lang = (await cookies()).get('lang')?.value === 'da' ? 'da' : 'en'
  const t = translations[lang]

  const ERRORS = {
    invalid: t.cust_signup_err_invalid,
    mail: t.cust_signup_err_mail,
    server: t.cust_signup_err_server,
  }
  const error = searchParams?.error ? (ERRORS[searchParams.error] || ERRORS.server) : null

  return (
    <AuthShell title={t.cust_signup_title} sub={t.cust_signup_sub}>
      {error && <Banner kind="error">{error}</Banner>}

      <form method="POST" action="/api/customer/signup" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={t.cust_login_email}>
          <input name="email" type="email" required autoComplete="username" placeholder="you@company.com" style={inputStyle} />
        </Field>
        <Field label={t.cust_login_password}>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder={t.cust_pw_hint} style={inputStyle} />
        </Field>
        <Field label={t.cust_signup_password2}>
          <input name="password2" type="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" style={inputStyle} />
        </Field>
        <button type="submit" style={btnPrimaryStyle}>{t.cust_signup_btn}</button>
      </form>

      <p style={{ fontSize: 13, color: '#aebdb3', margin: '20px 0 0', textAlign: 'center' }}>
        {t.cust_signup_have_account} <a href="/login" style={linkStyle}>{t.cust_signup_login_link}</a>
      </p>
    </AuthShell>
  )
}
