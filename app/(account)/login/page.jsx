import { cookies } from 'next/headers'
import { translations } from '@/lib/translations'
import AuthShell, { Banner, Field, inputStyle, btnPrimaryStyle, linkStyle } from '../AuthShell'
import PasswordInput from '../PasswordInput'

export const dynamic = 'force-dynamic'

export default async function CustomerLogin({ searchParams }) {
  const lang = (await cookies()).get('lang')?.value === 'da' ? 'da' : 'en'
  const t = translations[lang]

  const ERRORS = {
    invalid: t.cust_login_err_invalid,
    server: t.cust_login_err_server,
    config: t.cust_login_err_config,
  }
  const NOTICES = {
    exists: t.cust_login_notice_exists,
    verify: t.cust_login_notice_verify,
  }
  const error = searchParams?.error ? (ERRORS[searchParams.error] || ERRORS.invalid) : null
  const notice = searchParams?.notice ? NOTICES[searchParams.notice] : null
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '/mine-ordrer'

  return (
    <AuthShell title={t.cust_login_title} sub={t.cust_login_sub}>
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="notice">{notice}</Banner>}

      <form method="POST" action="/api/customer/login" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="hidden" name="next" value={next} />
        <Field label={t.cust_login_email}>
          <input name="email" type="email" required autoComplete="username" placeholder="you@company.com" style={inputStyle} />
        </Field>
        <Field label={t.cust_login_password}>
          <PasswordInput name="password" autoComplete="current-password" placeholder="••••••••" />
        </Field>
        <button type="submit" style={btnPrimaryStyle}>{t.cust_login_btn}</button>
      </form>

      <p style={{ fontSize: 13, color: '#aebdb3', margin: '20px 0 0', textAlign: 'center' }}>
        {t.cust_login_no_account} <a href="/opret" style={linkStyle}>{t.cust_login_signup_link}</a>
      </p>
    </AuthShell>
  )
}
