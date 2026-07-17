import { Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { getAdminT } from '@/lib/admin-i18n'

export const dynamic = 'force-dynamic'

export default async function AdminCustomers({ searchParams }) {
  const { t } = await getAdminT()

  const STATUS = {
    created:  ['ok',  t.st_cust_created],
    updated:  ['ok',  t.st_cust_updated],
    deleted:  ['ok',  t.st_cust_deleted],
    reset:    ['ok',  t.st_cust_reset],
    exists:   ['err', t.st_cust_exists],
    invalid:  ['err', t.st_cust_invalid],
    notfound: ['err', t.st_cust_notfound],
    error:    ['err', t.st_error],
  }

  const { data: customers } = await supabase
    .from('customers')
    .select('id, email, email_verified, password_hash, created_at')
    .order('created_at', { ascending: false })

  const note      = searchParams?.status ? STATUS[searchParams.status] : null
  const editingId = searchParams?.edit   || null
  const resetId   = searchParams?.reset  || null

  return (
    <>
      <h1 className="a-h1">{t.cust_title}</h1>
      <p className="a-sub">{t.cust_sub}</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}

      <div className="a-card" style={{ maxWidth: 600, marginBottom: 24 }}>
        <form method="POST" action="/api/admin/customers" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <input type="hidden" name="action" value="create" />
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="a-label" htmlFor="new-email">{t.cust_add}</label>
            <input id="new-email" className="a-input" name="email" type="email" required placeholder={t.cust_email_ph} />
          </div>
          <div style={{ flex: 1, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="a-label" htmlFor="new-pw">{t.cust_pw_label}</label>
            <input id="new-pw" className="a-input" name="password" type="password" required minLength={8} placeholder={t.cust_pw_ph} />
          </div>
          <button type="submit" className="a-btn">{t.cust_add_btn}</button>
        </form>
      </div>

      <div className="a-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="a-table">
          <thead>
            <tr>
              <th>{t.cust_col_email}</th>
              <th>{t.cust_col_status}</th>
              <th>{t.cust_col_created}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(customers || []).length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: '#7a7672', textAlign: 'center', padding: '28px 14px' }}>
                  {t.cust_empty}
                </td>
              </tr>
            )}
            {(customers || []).map(c => {
              const isEditing  = editingId === c.id
              const isResetting = resetId  === c.id
              return (
                <Fragment key={c.id}>
                  <tr>
                    <td>{c.email}</td>
                    <td>
                      {c.email_verified
                        ? <span className="a-badge completed">{t.cust_verified}</span>
                        : <span className="a-badge pending">{t.cust_unverified}</span>}
                    </td>
                    <td style={{ color: '#7a7672', fontSize: 13 }}>
                      {new Date(c.created_at).toLocaleDateString(t.date_locale)}
                    </td>
                    <td>
                      {!isEditing && !isResetting && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <a href={`/admin/customers?edit=${c.id}`} className="a-btn-2" style={{ textDecoration: 'none' }}>
                            {t.cust_edit}
                          </a>
                          <a href={`/admin/customers?reset=${c.id}`} className="a-btn-2" style={{ textDecoration: 'none' }}>
                            {t.cust_reset_pw}
                          </a>
                          <form method="POST" action="/api/admin/customers">
                            <input type="hidden" name="action" value="delete" />
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="a-btn-danger" data-confirm={t.cust_confirm_delete}>
                              {t.cust_delete}
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>

                  {isEditing && (
                    <tr>
                      <td colSpan={4} style={{ padding: '10px 14px', background: '#242220', borderTop: '1px solid #2e2e2e' }}>
                        <form method="POST" action="/api/admin/customers" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input type="hidden" name="action" value="update" />
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            className="a-input"
                            name="email"
                            type="email"
                            defaultValue={c.email}
                            required
                            style={{ flex: 1, minWidth: 220 }}
                          />
                          <button type="submit" className="a-btn-2">{t.cust_save}</button>
                          <a href="/admin/customers" className="a-btn-2" style={{ textDecoration: 'none' }}>{t.cust_cancel}</a>
                        </form>
                      </td>
                    </tr>
                  )}

                  {isResetting && (
                    <tr>
                      <td colSpan={4} style={{ padding: '10px 14px', background: '#242220', borderTop: '1px solid #2e2e2e' }}>
                        <form method="POST" action="/api/admin/customers" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input type="hidden" name="action" value="reset" />
                          <input type="hidden" name="id" value={c.id} />
                          <span style={{ color: '#7a7672', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>{c.email}</span>
                          <input
                            className="a-input"
                            name="password"
                            type="text"
                            required
                            minLength={8}
                            placeholder={t.cust_new_pw_ph}
                            style={{ flex: 1, minWidth: 200 }}
                          />
                          <button type="submit" className="a-btn-2">{t.cust_save}</button>
                          <a href="/admin/customers" className="a-btn-2" style={{ textDecoration: 'none' }}>{t.cust_cancel}</a>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
