'use client'

// EN | DA toggle for the admin. Sets the admin_lang cookie and reloads.
// Self-styled with inline styles so it works in the dash nav and on the login page.
export default function AdminLangSwitcher({ lang }) {
  const set = l => {
    document.cookie = 'admin_lang=' + l + ';path=/;max-age=31536000;SameSite=Lax'
    location.reload()
  }
  const btn = active => ({
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.08em',
    padding: '2px 5px', borderRadius: 4, color: active ? '#f1562e' : '#7a7672',
  })
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <button type="button" style={btn(lang === 'en')} onClick={() => set('en')}>EN</button>
      <span style={{ color: '#4a4640', fontSize: 11 }}>|</span>
      <button type="button" style={btn(lang === 'da')} onClick={() => set('da')}>DA</button>
    </span>
  )
}
