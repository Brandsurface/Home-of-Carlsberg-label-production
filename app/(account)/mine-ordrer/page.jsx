import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { translations } from '@/lib/translations'
import { getCustomerUser } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

function canSummary(o) {
  const parts = [o.brand, o.variant, o.size, o.region].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

// Customer-facing status badge (mirrors the admin logic, customer palette).
function statusBadge(o, t) {
  if (o.pm_status) {
    const pmBadges = {
      not_handled:    { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', text: t.cust_pm_not_handled },
      quote_approval: { bg: 'rgba(249,115,22,0.12)',  color: '#f97316', text: t.cust_pm_quote_approval },
      awaiting_info:  { bg: 'rgba(248,113,113,0.12)', color: '#f87171', text: t.cust_pm_awaiting_info },
      taken_further:  { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa', text: t.cust_pm_taken_further },
      completed:      { bg: 'rgba(158,214,184,0.14)', color: '#9ed6b8', text: t.cust_pm_completed },
    }
    if (pmBadges[o.pm_status]) return pmBadges[o.pm_status]
  }
  if (o.status === 'confirmed') return { bg: 'rgba(158,214,184,0.14)', color: '#9ed6b8', text: t.cust_badge_sent }
  if (o.status === 'cancelled') return { bg: 'rgba(248,113,113,0.10)', color: '#f87171', text: t.cust_badge_edited }
  if (o.send_after) {
    if (Date.now() < new Date(o.send_after).getTime()) return { bg: 'rgba(241,86,46,0.12)', color: '#f1562e', text: t.cust_badge_awaiting }
    return { bg: 'rgba(158,214,184,0.14)', color: '#9ed6b8', text: t.cust_badge_sent }
  }
  return { bg: 'rgba(241,86,46,0.12)', color: '#f1562e', text: t.cust_badge_pending }
}

export default async function MyOrders() {
  const me = await getCustomerUser()
  if (!me) redirect('/login?next=/mine-ordrer')

  const lang = (await cookies()).get('lang')?.value === 'da' ? 'da' : 'en'
  const t = translations[lang]
  const locale = t.email_date_locale || (lang === 'da' ? 'da-DK' : 'en-GB')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at, status, butiksnavn, brand, variant, size, region, revision, send_after, pm_status')
    .ilike('email', me.email)
    .order('created_at', { ascending: false })
    .limit(200)

  const list = orders || []
  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso }
  }

  const linkBtn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px',
    borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit',
    border: '1px solid #33453b', color: '#eef2ee', background: '#1b2922',
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'linear-gradient(160deg,#16231c 0%,#0b120e 100%)', backgroundAttachment: 'fixed',
      fontFamily: "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: '#eef2ee',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', height: 60,
        borderBottom: '1px solid #33453b', position: 'sticky', top: 0, background: 'rgba(11,18,14,0.7)', backdropFilter: 'blur(6px)', zIndex: 10,
      }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.02em', color: '#f1562e' }}>BRANDSURFACE</span>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#7d8c82' }}>
          <span>{me.email}</span>
          <a href="/api/customer/logout" style={{ color: '#aebdb3', textDecoration: 'none' }}>{t.myorders_logout}</a>
        </div>
      </header>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '36px 28px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>{t.myorders_title}</h1>
            <p style={{ color: '#aebdb3', fontSize: 14, margin: 0 }}>{t.myorders_sub.replace('{n}', list.length)}</p>
          </div>
          <a href="/" style={{ ...linkBtn, background: '#f1562e', color: '#fff', border: 'none', padding: '11px 22px', fontSize: 14, fontWeight: 700 }}>
            {t.myorders_new_order}
          </a>
        </div>

        {list.length === 0 ? (
          <div style={{ background: '#16211b', border: '1px solid #33453b', borderRadius: 16, padding: 40, textAlign: 'center', color: '#7d8c82' }}>
            {t.myorders_empty}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(o => {
              const b = statusBadge(o, t)
              const editable = o.status === 'pending' && (!o.send_after || new Date(o.send_after).getTime() > Date.now())
              return (
                <div key={o.id} style={{
                  background: '#16211b', border: '1px solid #33453b', borderRadius: 14, padding: '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {o.butiksnavn || '—'}
                      {o.revision > 0 && <span style={{ color: '#7d8c82', fontSize: 12, fontWeight: 400 }}> · rev {o.revision}</span>}
                    </div>
                    <div style={{ color: '#aebdb3', fontSize: 13, marginTop: 3 }}>{canSummary(o)}</div>
                    <div style={{ color: '#7d8c82', fontSize: 12, marginTop: 3 }}>{fmtDate(o.created_at)}</div>
                  </div>
                  <span style={{
                    background: b.bg, color: b.color, padding: '3px 12px', borderRadius: 999,
                    fontFamily: "'IBM Plex Mono','DM Mono',monospace", fontSize: 11, whiteSpace: 'nowrap',
                  }}>{b.text}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={`/?copy=${o.id}`} style={linkBtn}>{t.myorders_copy}</a>
                    {editable && <a href={`/?edit=${o.id}`} style={linkBtn}>{t.myorders_edit}</a>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
