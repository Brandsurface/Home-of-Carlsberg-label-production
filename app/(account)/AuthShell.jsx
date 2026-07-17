// Shared presentational shell for the customer auth pages (customer theme).
// Server component, no client JS — forms post directly to /api/customer/*.

export const inputStyle = {
  background: '#1b2922', border: '1px solid #33453b', borderRadius: 10, padding: '12px 14px',
  color: '#eef2ee', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
}
export const labelSpanStyle = {
  fontFamily: "'IBM Plex Mono','DM Mono',monospace", fontSize: 11, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#aebdb3',
}
export const btnPrimaryStyle = {
  marginTop: 6, padding: '13px 24px', background: '#f1562e', color: '#fff', border: 'none',
  borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%',
}
export const linkStyle = { color: '#9ed6b8', textDecoration: 'none', fontWeight: 600 }

export function Banner({ kind, children }) {
  const err = kind === 'error'
  return (
    <div style={{
      background: err ? 'rgba(248,113,113,0.1)' : 'rgba(158,214,184,0.12)',
      border: `1px solid ${err ? 'rgba(248,113,113,0.3)' : 'rgba(158,214,184,0.45)'}`,
      color: err ? '#f87171' : '#9ed6b8',
      borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, lineHeight: 1.5,
    }}>{children}</div>
  )
}

export function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={labelSpanStyle}>{label}</span>
      {children}
    </label>
  )
}

export default function AuthShell({ title, sub, children }) {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#16231c 0%,#0b120e 100%)', backgroundAttachment: 'fixed',
      fontFamily: "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      padding: '40px 20px', color: '#eef2ee',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.02em', color: '#f1562e' }}>BRANDSURFACE</span>
          </a>
        </div>
        <div style={{ background: '#16211b', border: '1px solid #33453b', borderRadius: 22, padding: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>{title}</h1>
          {sub && <p style={{ fontSize: 13, color: '#aebdb3', margin: '0 0 22px', lineHeight: 1.5 }}>{sub}</p>}
          {children}
        </div>
      </div>
    </main>
  )
}
