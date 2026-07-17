import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/admin-auth'
import { getAdminT } from '@/lib/admin-i18n'
import AdminLangSwitcher from '../AdminLangSwitcher'

export const dynamic = 'force-dynamic'

const ADMIN_CSS = `
.a-body { margin:0; min-height:100vh; background:linear-gradient(160deg,#16231c 0%,#0b120e 60%); background-attachment:fixed;
  font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#f0ede8; }
.a-nav { display:flex; align-items:center; gap:24px; padding:0 28px; height:60px; border-bottom:1px solid #4a4640;
  background:rgba(14,10,0,0.7); position:sticky; top:0; z-index:10; }
.a-logo { font-size:18px; font-weight:800; letter-spacing:0.02em; color:#f1562e; }
.a-nav-links { display:flex; gap:6px; }
.a-nav-link { padding:6px 12px; border-radius:999px; font-size:13px; color:#b8b4ae; text-decoration:none; }
.a-nav-link:hover { color:#f0ede8; background:#242220; }
.a-nav-link.active { color:#f1562e; background:rgba(241,86,46,0.12); }
.a-nav-right { margin-left:auto; display:flex; align-items:center; gap:14px; font-size:12px; color:#7a7672; }
.a-nav-right a { color:#b8b4ae; text-decoration:none; }
.a-nav-right a:hover { color:#f87171; }
.a-wrap { max-width:1000px; margin:0 auto; padding:36px 28px 80px; }
.a-h1 { font-size:28px; font-weight:800; letter-spacing:-0.02em; margin:0 0 6px; }
.a-sub { color:#b8b4ae; font-size:14px; margin:0 0 28px; }
.a-card { background:#1e1d1a; border:1px solid #4a4640; border-radius:16px; padding:20px; }
.a-label { font-family:'DM Mono',monospace; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:#7a7672; }
.a-input { background:#242220; border:1px solid #4a4640; border-radius:10px; padding:11px 13px; color:#f0ede8; font-size:14px; font-family:inherit; outline:none; width:100%; box-sizing:border-box; }
.a-btn { padding:11px 22px; background:#f1562e; color:#fff; border:none; border-radius:999px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; }
.a-btn-2 { padding:8px 16px; background:#242220; color:#f0ede8; border:1px solid #4a4640; border-radius:999px; font-size:13px; font-weight:500; cursor:pointer; font-family:inherit; }
.a-btn-danger { padding:7px 14px; background:transparent; color:#f87171; border:1px solid rgba(248,113,113,0.35); border-radius:999px; font-size:12px; cursor:pointer; font-family:inherit; }
.a-table { width:100%; border-collapse:collapse; }
.a-table th { text-align:left; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#7a7672; padding:0 14px 12px; font-weight:500; }
.a-table td { padding:14px; border-top:1px solid #2e2e2e; font-size:14px; color:#f0ede8; vertical-align:top; }
.a-badge { display:inline-block; padding:2px 10px; border-radius:999px; font-family:'DM Mono',monospace; font-size:11px; }
.a-badge.pending { background:rgba(241,86,46,0.12); color:#f1562e; }
.a-badge.confirmed { background:rgba(251,191,36,0.1); color:#fbbf24; }
.a-badge.cancelled { background:rgba(249,115,22,0.1); color:#f97316; }
.a-badge.completed { background:rgba(74,222,128,0.1); color:#4ade80; }
.a-note { font-size:13px; border-radius:10px; padding:10px 14px; margin-bottom:18px; }
.a-note.ok { background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.3); color:#4ade80; }
.a-note.err { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3); color:#f87171; }
.pm-select { background:#1a1917; border:1px solid #3a3733; border-radius:8px; padding:4px 8px; color:#b8b4ae; font-size:12px; font-family:'DM Mono',monospace; cursor:pointer; outline:none; }
.pm-select:hover { border-color:#5a5650; }
.pm-select.not_handled    { border-color:rgba(251,191,36,0.5);  color:#fbbf24; background:rgba(251,191,36,0.08); }
.pm-select.quote_approval { border-color:rgba(249,115,22,0.5);  color:#f97316; background:rgba(249,115,22,0.08); }
.pm-select.awaiting_info  { border-color:rgba(248,113,113,0.5); color:#f87171; background:rgba(248,113,113,0.08); }
.pm-select.taken_further  { border-color:rgba(96,165,250,0.5);  color:#60a5fa; background:rgba(96,165,250,0.08); }
.pm-select.completed      { border-color:rgba(74,222,128,0.4);  color:#4ade80; background:rgba(74,222,128,0.08); }
.og-builder { display:flex; flex-direction:column; gap:10px; }
.og-group { border:1px solid #4a4640; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px; background:#242220; }
.og-group-head { display:flex; gap:8px; align-items:center; }
.og-opts { display:flex; flex-direction:column; gap:6px; padding-left:14px; border-left:2px solid #3a3733; margin-left:2px; }
.og-opt { display:flex; gap:8px; align-items:center; }
.og-del { background:transparent; border:1px solid rgba(248,113,113,0.35); color:#f87171; border-radius:8px; width:34px; height:34px; flex-shrink:0; cursor:pointer; font-size:18px; line-height:1; font-family:inherit; }
.og-del:hover { background:rgba(248,113,113,0.1); }
.og-add-opt, .og-add-group { align-self:flex-start; padding:7px 14px; background:#2e2e2e; border:1px solid #4a4640; border-radius:999px; color:#b8b4ae; font-size:12px; cursor:pointer; font-family:inherit; }
.og-add-opt:hover, .og-add-group:hover { color:#f0ede8; border-color:#5a5650; }
.podio-overlay { position:fixed; inset:0; z-index:100; background:rgba(5,9,7,0.72); backdrop-filter:blur(5px); display:flex; align-items:flex-start; justify-content:center; padding:60px 20px; overflow-y:auto; }
.podio-modal { width:100%; max-width:460px; background:#1e1d1a; border:1px solid #4a4640; border-radius:16px; padding:24px; box-shadow:0 30px 80px rgba(0,0,0,0.55); }
.podio-modal-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
.podio-x { background:#242220; border:1px solid #4a4640; color:#b8b4ae; width:32px; height:32px; border-radius:50%; font-size:20px; line-height:1; cursor:pointer; font-family:inherit; }
.podio-x:hover { color:#f0ede8; border-color:#5a5650; }
`

export default async function DashLayout({ children }) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const { lang, t } = await getAdminT()

  return (
    <div className="a-body">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <nav className="a-nav">
        <span className="a-logo">BRANDSURFACE</span>
        <div className="a-nav-links">
          <a className="a-nav-link" href="/admin">{t.nav_orders}</a>
          <a className="a-nav-link" href="/admin/products">{t.nav_products}</a>
          <a className="a-nav-link" href="/admin/settings">{t.nav_settings}</a>
          <a className="a-nav-link" href="/admin/customers">{t.nav_customers}</a>
          {user.is_master && <a className="a-nav-link" href="/admin/users">{t.nav_users}</a>}
        </div>
        <div className="a-nav-right">
          <AdminLangSwitcher lang={lang} />
          <span>{user.email}</span>
          <a href="/api/admin/logout">{t.nav_logout}</a>
        </div>
      </nav>
      <div className="a-wrap">{children}</div>
      <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('submit',function(e){var b=e.submitter;if(b&&b.dataset.confirm&&!window.confirm(b.dataset.confirm))e.preventDefault();});" }} />
    </div>
  )
}
