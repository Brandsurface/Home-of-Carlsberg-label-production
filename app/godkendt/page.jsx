import { cookies } from 'next/headers'

const T = {
  en: {
    ok_h: 'This tab can be closed.',
    ok_b: 'Your order is being submitted to Brandsurface. You will receive an order confirmation shortly.',
    already_h: 'Already approved',
    already_b: 'This order has already been approved and forwarded to Brandsurface.',
    err_h: 'Something went wrong',
    err_b: 'We could not process your approval. Please try again or contact Brandsurface directly.',
    back: '← Place new order',
  },
  da: {
    ok_h: 'Denne fane kan lukkes.',
    ok_b: 'Din ordre sendes til Brandsurface. Du modtager en ordrebekræftelse snarest.',
    already_h: 'Allerede godkendt',
    already_b: 'Denne ordre er allerede godkendt og videresendt til Brandsurface.',
    err_h: 'Noget gik galt',
    err_b: 'Vi kunne ikke behandle din godkendelse. Prøv igen eller kontakt Brandsurface direkte.',
    back: '← Opret ny ordre',
  },
}

export default async function GodkendtPage({ searchParams }) {
  const lang = (await cookies()).get('lang')?.value === 'da' ? 'da' : 'en'
  const t = T[lang]
  const isError = !!searchParams?.error
  const isAlready = searchParams?.already === '1'

  const heading = isError ? t.err_h : isAlready ? t.already_h : t.ok_h
  const body = isError ? t.err_b : isAlready ? t.already_b : t.ok_b

  const iconColor = isError ? '#f87171' : '#9ed6b8'
  const iconBg = isError ? 'rgba(248,113,113,0.1)' : 'rgba(158,214,184,0.14)'
  const iconBorder = isError ? 'rgba(248,113,113,0.25)' : 'rgba(158,214,184,0.45)'

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #16231c 0%, #0b120e 100%)',
      backgroundAttachment: 'fixed',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Manrope', -apple-system, sans-serif",
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: iconBg, border: `1px solid ${iconBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          {isError ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          )}
        </div>

        <h1 style={{ color: iconColor, fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 14px' }}>{heading}</h1>
        <p style={{ color: '#aebdb3', fontSize: 16, lineHeight: 1.6, margin: 0 }}>{body}</p>

        <a href="/" style={{ display: 'inline-block', marginTop: 36, padding: '12px 24px', color: '#aebdb3', fontSize: 14, textDecoration: 'none', fontFamily: 'inherit' }}>
          {t.back}
        </a>
      </div>
    </main>
  )
}
