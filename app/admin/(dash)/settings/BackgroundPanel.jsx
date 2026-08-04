'use client'

import { useState } from 'react'
import { BG_DEFAULTS, BG_KEYS, OVERLAY_IDS, normalizeBg, overlayDataUri } from '@/lib/background'

// Appearance controls for the order form's background: gradient, an uploaded
// image and a fine pattern overlay. Inputs carry their own `name`, so the
// panel submits with the surrounding settings form and needs no extra wiring.
export default function BackgroundPanel({ initial, t }) {
  const [v, setV] = useState(() => {
    const start = { ...BG_DEFAULTS }
    for (const k of BG_KEYS) if (initial?.[k]) start[k] = initial[k]
    return start
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, value) => setV(prev => ({ ...prev, [k]: value }))

  // Validated view of the current state — the same normalisation the public
  // page applies, so the preview can't promise a look the page won't render.
  const bg = normalizeBg(v)
  const patternUri = overlayDataUri(bg.overlay, bg.overlayColor)

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/admin/upload-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error || 'Upload failed')
      const put = await fetch(d.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
        body: file,
      })
      if (!put.ok) throw new Error('Upload failed')
      set('bg_image_url', d.publicUrl)
    } catch (e2) {
      setErr(e2?.message || 'Upload failed')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const overlayLabels = {
    none: t.bg_ov_none, dots: t.bg_ov_dots, lines: t.bg_ov_lines, honeycomb: t.bg_ov_honeycomb,
  }

  return (
    <div className="a-card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span className="a-label">{t.bg_heading}</span>
        <button type="button" className="a-btn-2" style={{ padding: '5px 12px', fontSize: 12 }}
          onClick={() => setV({ ...BG_DEFAULTS })}>{t.bg_reset}</button>
      </div>
      <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>{t.bg_help}</p>

      {/* Live preview — gradient, image and pattern stacked as the page does */}
      <div style={{
        position: 'relative', height: 170, borderRadius: 12, overflow: 'hidden',
        border: '1px solid #4a4640',
        background: `linear-gradient(${bg.angle}deg, ${bg.from} 0%, ${bg.to} 60%)`,
      }}>
        {bg.imageUrl && (
          <div style={{
            position: 'absolute', inset: 0, backgroundImage: `url("${bg.imageUrl}")`,
            backgroundSize: 'cover', backgroundPosition: 'center', opacity: bg.imageOpacity / 100,
          }} />
        )}
        {patternUri && (
          <div style={{
            position: 'absolute', inset: 0, backgroundImage: `url("${patternUri}")`,
            opacity: bg.overlayOpacity / 100,
          }} />
        )}
        {/* Mock card, so contrast against real surfaces is visible */}
        <div style={{
          position: 'absolute', left: 18, bottom: 18, right: 18, padding: '12px 14px',
          background: 'rgba(22,33,27,0.88)', border: '1px solid #33453b', borderRadius: 10,
        }}>
          <div style={{ height: 7, width: 90, borderRadius: 4, background: '#9ed6b8', opacity: 0.85 }} />
          <div style={{ height: 6, width: '70%', borderRadius: 4, background: '#33453b', marginTop: 8 }} />
        </div>
      </div>

      {/* ── Gradient ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="a-label">{t.bg_gradient}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ColorField label={t.bg_from} value={v.bg_gradient_from} name="bg_gradient_from"
            onChange={val => set('bg_gradient_from', val)} />
          <ColorField label={t.bg_to} value={v.bg_gradient_to} name="bg_gradient_to"
            onChange={val => set('bg_gradient_to', val)} />
        </div>
        <Slider label={t.bg_angle} suffix="°" min={0} max={360} name="bg_gradient_angle"
          value={v.bg_gradient_angle} onChange={val => set('bg_gradient_angle', val)} />
      </div>

      {/* ── Background image ── */}
      <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="a-label">{t.bg_image}</span>
        <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>{t.bg_image_help}</p>
        <input type="hidden" name="bg_image_url" value={v.bg_image_url} readOnly />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label className="a-btn-2" style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? t.bg_uploading : t.bg_choose_file}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
              onChange={onFile} disabled={busy} style={{ display: 'none' }} />
          </label>
          {v.bg_image_url && (
            <>
              <span style={{
                width: 46, height: 32, borderRadius: 6, border: '1px solid #4a4640',
                backgroundImage: `url("${bg.imageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
              <button type="button" className="a-btn-danger" onClick={() => set('bg_image_url', '')}>
                {t.bg_remove}
              </button>
            </>
          )}
        </div>
        {err && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{err}</p>}

        {/* Kept mounted while hidden so its value still submits and isn't
            reset the next time an image is uploaded. */}
        <div style={{ display: v.bg_image_url ? 'block' : 'none' }}>
          <Slider label={t.bg_opacity} suffix="%" min={0} max={100} name="bg_image_opacity"
            value={v.bg_image_opacity} onChange={val => set('bg_image_opacity', val)} />
        </div>
      </div>

      {/* ── Pattern overlay ── */}
      <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="a-label">{t.bg_overlay}</span>
        <p style={{ fontSize: 12, color: '#7a7672', margin: 0, lineHeight: 1.5 }}>{t.bg_overlay_help}</p>
        <input type="hidden" name="bg_overlay" value={v.bg_overlay} readOnly />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {OVERLAY_IDS.map(id => {
            const uri = overlayDataUri(id, bg.overlayColor)
            const active = v.bg_overlay === id
            return (
              <button key={id} type="button" onClick={() => set('bg_overlay', id)}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 6, padding: 6, cursor: 'pointer',
                  background: active ? 'rgba(241,86,46,0.12)' : '#242220',
                  border: `1px solid ${active ? '#f1562e' : '#4a4640'}`,
                  borderRadius: 9, fontFamily: 'inherit',
                }}>
                <span style={{
                  display: 'block', height: 34, borderRadius: 5, background: '#0d1410',
                  backgroundImage: uri ? `url("${uri}")` : 'none',
                }} />
                <span style={{ fontSize: 11, color: active ? '#f1562e' : '#b8b4ae' }}>{overlayLabels[id]}</span>
              </button>
            )
          })}
        </div>

        <div style={{
          display: v.bg_overlay === 'none' ? 'none' : 'flex',
          flexDirection: 'column', gap: 10,
        }}>
          <ColorField label={t.bg_overlay_color} value={v.bg_overlay_color} name="bg_overlay_color"
            onChange={val => set('bg_overlay_color', val)} />
          <Slider label={t.bg_opacity} suffix="%" min={0} max={100} name="bg_overlay_opacity"
            value={v.bg_overlay_opacity} onChange={val => set('bg_overlay_opacity', val)} />
        </div>
      </div>
    </div>
  )
}

// Colour swatch + hex field kept in sync; the hex box accepts partial typing
// and only the swatch enforces a valid value.
function ColorField({ label, value, name, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="a-label" style={{ fontSize: 10 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 38, height: 38, padding: 2, flexShrink: 0, cursor: 'pointer',
            background: '#242220', border: '1px solid #4a4640', borderRadius: 8,
          }} />
        <input className="a-input" name={name} value={value} spellCheck={false}
          onChange={e => onChange(e.target.value)}
          style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, padding: '9px 11px' }} />
      </div>
    </div>
  )
}

function Slider({ label, suffix, min, max, name, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label className="a-label" style={{ fontSize: 10 }}>{label}</label>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#b8b4ae' }}>
          {value}{suffix}
        </span>
      </div>
      <input type="range" name={name} min={min} max={max} value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', accentColor: '#f1562e', cursor: 'pointer' }} />
    </div>
  )
}
