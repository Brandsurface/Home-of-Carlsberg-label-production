import { supabase } from '@/lib/supabase'
import { getAdminT } from '@/lib/admin-i18n'
import EmployeeBuilder from './EmployeeBuilder'

export const dynamic = 'force-dynamic'

export default async function AdminSettings({ searchParams }) {
  const { t } = await getAdminT()
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['brandsurface_email', 'confirm_delay_minutes', 'help_box_active', 'help_box_html',
      'hero_title_en', 'hero_title_da', 'hero_sub_en', 'hero_sub_da',
      'op_label_en', 'op_label_da', 'op_sub_en', 'op_sub_da',
      'op_step1_title_en', 'op_step1_title_da', 'op_step1_p_en', 'op_step1_p_da',
      'op_step2_title_en', 'op_step2_title_da', 'op_step2_p_en', 'op_step2_p_da',
      'op_step3_title_en', 'op_step3_title_da', 'op_step3_p_en', 'op_step3_p_da',
      'op_step4_title_en', 'op_step4_title_da', 'op_step4_p_en', 'op_step4_p_da',
      'podio_app_id', 'podio_field_job_no', 'podio_field_job_name', 'podio_field_responsible', 'podio_employees'])
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  const currentEmail = map.brandsurface_email || ''
  const currentDelay = map.confirm_delay_minutes ?? '10'
  const helpBoxActive = map.help_box_active === '1'
  const helpBoxHtml = map.help_box_html || ''
  let employees = []
  try { employees = JSON.parse(map.podio_employees || '[]') } catch {}
  const status = searchParams?.status

  return (
    <>
      <h1 className="a-h1">{t.settings_title}</h1>
      <p className="a-sub">{t.settings_sub}</p>

      {status === 'saved' && <div className="a-note ok">{t.settings_saved}</div>}
      {status === 'error' && <div className="a-note err">{t.settings_error}</div>}

      <div className="a-card" style={{ maxWidth: 520 }}>
        <form method="POST" action="/api/admin/settings" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="a-label" htmlFor="bs-email">{t.settings_email_label}</label>
            <input id="bs-email" className="a-input" name="brandsurface_email" type="email"
              defaultValue={currentEmail} placeholder="orders@brandsurface.dk" />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>
              {t.settings_email_help_pre}<code style={{ fontFamily: "'DM Mono',monospace" }}>BRANDSURFACE_EMAIL</code>{t.settings_email_help_post}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="a-label" htmlFor="delay">{t.settings_delay_label}</label>
            <input id="delay" className="a-input" name="confirm_delay_minutes" type="number" min="0" step="1"
              defaultValue={currentDelay} placeholder="10" style={{ maxWidth: 160 }} />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>
              {t.settings_delay_help}
            </p>
          </div>

          <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="a-label">{t.settings_helpbox_label}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#f0ede8' }}>
              <input type="checkbox" name="help_box_active" value="1" defaultChecked={helpBoxActive}
                style={{ width: 16, height: 16, accentColor: '#f1562e', cursor: 'pointer' }} />
              {t.settings_helpbox_show}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['b', t.settings_fmt_bold], ['u', t.settings_fmt_underline], ['br', t.settings_fmt_linebreak]].map(([tag, label]) => (
                <button key={tag} type="button" onClick={undefined}
                  data-tag={tag}
                  style={{ padding: '4px 10px', background: '#2e2e2e', border: '1px solid #4a4640', borderRadius: 6, color: '#b8b4ae', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                  dangerouslySetInnerHTML={{ __html: tag === 'br' ? '&#x21B5; br' : `<${tag}>${label}</${tag}>` }}
                />
              ))}
            </div>
            <textarea id="help-content" className="a-input" name="help_box_html" rows={5}
              defaultValue={helpBoxHtml}
              placeholder={'<b>Need help?</b><br>Contact us: <a href="mailto:info@brandsurface.dk">info@brandsurface.dk</a>'}
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, resize: 'vertical' }} />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>
              {t.settings_supports_prefix} <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;b&gt;</code> {t.word_bold},{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;u&gt;</code> {t.word_underline},{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;br&gt;</code> {t.word_linebreak},{' '}
              <code style={{ fontFamily: "'DM Mono',monospace" }}>&lt;a href=""&gt;</code> {t.word_link}.
            </p>
          </div>

          <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="a-label">{t.settings_hero_heading}</span>
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>{t.settings_hero_help}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label" htmlFor="hero-title-en">{t.settings_hero_title_en}</label>
                <input id="hero-title-en" className="a-input" name="hero_title_en"
                  defaultValue={map.hero_title_en || ''} placeholder="Can Artwork & Production - Brief" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label" htmlFor="hero-title-da">{t.settings_hero_title_da}</label>
                <input id="hero-title-da" className="a-input" name="hero_title_da"
                  defaultValue={map.hero_title_da || ''} placeholder="Can Artwork & Production - Brief" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="a-label" htmlFor="hero-sub-en">{t.settings_hero_sub_en}</label>
              <textarea id="hero-sub-en" className="a-input" name="hero_sub_en" rows={3}
                defaultValue={map.hero_sub_en || ''}
                placeholder="Choose brand, set the technical specs and fill in the details…"
                style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="a-label" htmlFor="hero-sub-da">{t.settings_hero_sub_da}</label>
              <textarea id="hero-sub-da" className="a-input" name="hero_sub_da" rows={3}
                defaultValue={map.hero_sub_da || ''}
                placeholder="Vælg mærke, angiv de tekniske specifikationer og udfyld detaljerne…"
                style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span className="a-label">{t.settings_op_heading}</span>
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>{t.settings_op_help}</p>
            {/* Label + subtitle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label">{t.settings_op_label} — {t.settings_op_en}</label>
                <input className="a-input" name="op_label_en" defaultValue={map.op_label_en || ''} placeholder="Order Process" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label">{t.settings_op_label} — {t.settings_op_da}</label>
                <input className="a-input" name="op_label_da" defaultValue={map.op_label_da || ''} placeholder="Ordreproces" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label">{t.settings_op_sub} — {t.settings_op_en}</label>
                <input className="a-input" name="op_sub_en" defaultValue={map.op_sub_en || ''} placeholder="Manage your can production workflow" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label">{t.settings_op_sub} — {t.settings_op_da}</label>
                <input className="a-input" name="op_sub_da" defaultValue={map.op_sub_da || ''} placeholder="Styr dit dåse-produktionsflow" />
              </div>
            </div>
            {/* Steps 1–4 */}
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6, borderTop: '1px solid #2a2a2a' }}>
                <span style={{ fontSize: 12, color: '#7a7672', fontFamily: "'DM Mono',monospace" }}>{t.settings_op_step} {n}</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label className="a-label">{t.settings_op_title} — {t.settings_op_en}</label>
                    <input className="a-input" name={`op_step${n}_title_en`} defaultValue={map[`op_step${n}_title_en`] || ''} placeholder={['Order Details','Brand Selection & Technical','Artwork','Review & Submit'][n-1]} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label className="a-label">{t.settings_op_title} — {t.settings_op_da}</label>
                    <input className="a-input" name={`op_step${n}_title_da`} defaultValue={map[`op_step${n}_title_da`] || ''} placeholder={['Ordredetaljer','Mærkevalg & Teknisk','Artwork','Gennemse & Indsend'][n-1]} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label className="a-label">{t.settings_op_desc} — {t.settings_op_en}</label>
                    <textarea className="a-input" name={`op_step${n}_p_en`} rows={2} defaultValue={map[`op_step${n}_p_en`] || ''}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label className="a-label">{t.settings_op_desc} — {t.settings_op_da}</label>
                    <textarea className="a-input" name={`op_step${n}_p_da`} rows={2} defaultValue={map[`op_step${n}_p_da`] || ''}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, resize: 'vertical' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="a-label">{t.settings_podio_heading}</span>
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>{t.settings_podio_help}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="a-label" htmlFor="podio-app">{t.settings_podio_appid}</label>
              <input id="podio-app" className="a-input" name="podio_app_id" inputMode="numeric"
                defaultValue={map.podio_app_id || ''} placeholder="123456789" style={{ maxWidth: 220 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label" htmlFor="pf-jobno">{t.settings_podio_field_jobno}</label>
                <input id="pf-jobno" className="a-input" name="podio_field_job_no" defaultValue={map.podio_field_job_no || ''} placeholder="job-number" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label" htmlFor="pf-jobname">{t.settings_podio_field_jobname}</label>
                <input id="pf-jobname" className="a-input" name="podio_field_job_name" defaultValue={map.podio_field_job_name || ''} placeholder="title" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label" htmlFor="pf-resp">{t.settings_podio_field_resp}</label>
                <input id="pf-resp" className="a-input" name="podio_field_responsible" defaultValue={map.podio_field_responsible || ''} placeholder="responsible" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="a-label">{t.settings_podio_employees}</label>
              <EmployeeBuilder initial={employees} name="podio_employees"
                nameLabel={t.settings_podio_emp_name} idLabel={t.settings_podio_emp_id} addLabel={t.settings_podio_add_emp} />
            </div>
          </div>

          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }}>{t.settings_save}</button>
        </form>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelectorAll('[data-tag]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var tag = btn.dataset.tag;
            var ta = document.getElementById('help-content');
            var s = ta.selectionStart, e = ta.selectionEnd;
            if (tag === 'br') {
              ta.setRangeText('<br>', s, s, 'end');
            } else {
              var sel = ta.value.slice(s, e);
              ta.setRangeText('<' + tag + '>' + (sel || '') + '</' + tag + '>', s, e, 'end');
            }
            ta.focus();
          });
        });
      `}} />
    </>
  )
}
