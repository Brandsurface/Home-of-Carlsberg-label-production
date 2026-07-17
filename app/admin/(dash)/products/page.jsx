import { supabase } from '@/lib/supabase'
import { getAdminT } from '@/lib/admin-i18n'
import ListBuilder from './ListBuilder'

export const dynamic = 'force-dynamic'

function parseList(value, fallback) {
  if (!value) return fallback
  try { const a = JSON.parse(value); return Array.isArray(a) ? a.map(String) : fallback } catch { return fallback }
}

export default async function AdminCatalogue({ searchParams }) {
  const { t } = await getAdminT()
  const STATUS = {
    'brand-created': ['ok', t.st_brand_created],
    'brand-saved': ['ok', t.st_brand_saved],
    'brand-deleted': ['ok', t.st_brand_deleted],
    'brand-invalid': ['err', t.st_brand_invalid],
    'opts-saved': ['ok', t.st_opts_saved],
    error: ['err', t.st_error],
  }

  const [{ data: brands }, { data: settingRows }] = await Promise.all([
    supabase.from('brands').select('id, name, variants, sort, active').order('sort', { ascending: true }),
    supabase.from('app_settings').select('key, value').in('key', ['sizes', 'regions', 'pantmaerke_exempt_region']),
  ])
  const s = Object.fromEntries((settingRows || []).map(r => [r.key, r.value]))
  const sizes = parseList(s.sizes, ['250 ml', '330 ml', '330 ml slim', '440 ml', '500 ml'])
  const regions = parseList(s.regions, ['DK', 'Border'])
  const pantExempt = s.pantmaerke_exempt_region || 'Border'

  const note = searchParams?.status ? STATUS[searchParams.status] : null

  return (
    <>
      <h1 className="a-h1">{t.cat_title}</h1>
      <p className="a-sub">{t.cat_sub}</p>

      {note && <div className={`a-note ${note[0]}`}>{note[1]}</div>}

      {/* ── Brands ── */}
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '8px 0 4px' }}>{t.brands_heading}</h2>
      <p className="a-sub">{t.brands_sub}</p>

      <div className="a-card" style={{ marginBottom: 20 }}>
        <form method="POST" action="/api/admin/products" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="hidden" name="action" value="create-brand" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 180 }}>
              <label className="a-label">{t.brand_new_label}</label>
              <input className="a-input" name="name" required placeholder={t.brand_name_ph} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 90 }}>
              <label className="a-label">{t.brand_sort}</label>
              <input className="a-input" name="sort" type="number" defaultValue={0} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="a-label">{t.brand_variants_label}</label>
            <ListBuilder initial={[]} name="variants" placeholder={t.brand_variant_ph} addLabel={t.lb_add} />
          </div>
          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }}>{t.brand_add}</button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
        {(brands || []).map(b => (
          <div key={b.id} className="a-card" style={{ opacity: b.active ? 1 : 0.55 }}>
            <form method="POST" action="/api/admin/products" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="hidden" name="action" value="update-brand" />
              <input type="hidden" name="id" value={b.id} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 2, minWidth: 180 }}>
                  <label className="a-label">{t.brand_name}</label>
                  <input className="a-input" name="name" defaultValue={b.name} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 90 }}>
                  <label className="a-label">{t.brand_sort}</label>
                  <input className="a-input" name="sort" type="number" defaultValue={b.sort} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b8b4ae', height: 40 }}>
                  <input type="checkbox" name="active" defaultChecked={b.active} /> {t.brand_active}
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="a-label">{t.brand_variants_label}</label>
                <ListBuilder initial={Array.isArray(b.variants) ? b.variants : []} name="variants" placeholder={t.brand_variant_ph} addLabel={t.lb_add} />
              </div>
              <button type="submit" className="a-btn-2" style={{ alignSelf: 'flex-start' }}>{t.brand_save}</button>
            </form>
            <form method="POST" action="/api/admin/products" style={{ marginTop: 10 }}>
              <input type="hidden" name="action" value="delete-brand" />
              <input type="hidden" name="id" value={b.id} />
              <button type="submit" className="a-btn-danger" data-confirm={`${t.brand_delete}: ${b.name}?`}>{t.brand_delete}</button>
            </form>
          </div>
        ))}
        {(!brands || brands.length === 0) && <div className="a-card" style={{ color: '#7a7672' }}>{t.brand_empty}</div>}
      </div>

      {/* ── Form options ── */}
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '8px 0 4px' }}>{t.opts_heading}</h2>
      <p className="a-sub">{t.opts_sub}</p>

      <div className="a-card" style={{ maxWidth: 720 }}>
        <form method="POST" action="/api/admin/products" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <input type="hidden" name="action" value="save-options" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="a-label">{t.opts_sizes}</label>
              <ListBuilder initial={sizes} name="sizes" placeholder={t.opts_value_ph} addLabel={t.lb_add} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="a-label">{t.opts_regions}</label>
              <ListBuilder initial={regions} name="regions" placeholder={t.opts_value_ph} addLabel={t.lb_add} />
            </div>
          </div>
          <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
            <label className="a-label">{t.opts_pant_exempt}</label>
            <input className="a-input" name="pantmaerke_exempt_region" defaultValue={pantExempt} />
            <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>{t.opts_pant_help}</p>
          </div>
          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }}>{t.opts_save}</button>
        </form>
      </div>
    </>
  )
}
