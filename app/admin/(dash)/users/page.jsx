import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'
import { getAdminT } from '@/lib/admin-i18n'

export const dynamic = 'force-dynamic'

export default async function AdminUsers({ searchParams }) {
  const { t } = await getAdminT()
  const STATUS = {
    created: ['ok', t.st_user_created],
    deleted: ['ok', t.st_user_deleted],
    reset: ['ok', t.st_user_reset],
    exists: ['err', t.st_user_exists],
    invalid: ['err', t.st_user_invalid],
    self: ['err', t.st_user_self],
    master: ['err', t.st_user_master],
    forbidden: ['err', t.st_user_forbidden],
    error: ['err', t.st_error],
  }

  const me = await getCurrentUser()
  if (!me?.is_master) {
    return (
      <>
        <h1 className="a-h1">{t.users_title}</h1>
        <div className="a-note err">{t.users_only_master}</div>
      </>
    )
  }

  const { data: users } = await supabase
    .from('admin_users')
    .select('id, email, is_master, password_hash, created_at')
    .order('created_at', { ascending: true })

  const note = searchParams?.status ? STATUS[searchParams.status] : null

  return (
    <>
      <h1 className="a-h1">{t.users_title}</h1>
      <p className="a-sub">{t.users_sub}</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}

      <div className="a-card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <form method="POST" action="/api/admin/users" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <input type="hidden" name="action" value="create" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 220 }}>
            <label className="a-label" htmlFor="new-email">{t.users_add}</label>
            <input id="new-email" className="a-input" name="email" type="email" required placeholder={t.users_add_ph} />
          </div>
          <button type="submit" className="a-btn">{t.users_add_btn}</button>
        </form>
      </div>

      <div className="a-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="a-table">
          <thead>
            <tr><th>{t.users_col_email}</th><th>{t.users_col_role}</th><th>{t.users_col_password}</th><th></th></tr>
          </thead>
          <tbody>
            {(users || []).map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.is_master ? <span className="a-badge confirmed">{t.users_role_master}</span> : <span style={{ color: '#7a7672' }}>{t.users_role_admin}</span>}</td>
                <td style={{ color: u.password_hash ? '#b8b4ae' : '#f1562e' }}>{u.password_hash ? t.users_pw_set : t.users_pw_notset}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <form method="POST" action="/api/admin/users">
                      <input type="hidden" name="action" value="reset" />
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className="a-btn-2">{t.users_reset_pw}</button>
                    </form>
                    {!u.is_master && u.id !== me.id && (
                      <form method="POST" action="/api/admin/users">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="a-btn-danger">{t.users_delete}</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
