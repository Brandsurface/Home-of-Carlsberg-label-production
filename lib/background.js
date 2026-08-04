// Background appearance for the order form — gradient, an optional uploaded
// image and a fine pattern overlay, all driven from admin Settings and stored
// as app_settings `bg_*` rows.
//
// Shared by the public page (which renders the real CSS) and the admin panel
// (which renders the live preview) so both read from one source of truth and
// can't drift apart.

export const BG_DEFAULTS = {
  bg_gradient_from: '#16231c', // matches --bg-1 in order.css
  bg_gradient_to: '#0b120e',   // matches --bg-2
  bg_gradient_angle: '160',
  bg_image_url: '',
  bg_image_opacity: '100',
  bg_overlay: 'none',
  bg_overlay_color: '#ffffff',
  bg_overlay_opacity: '18',
}

export const BG_KEYS = Object.keys(BG_DEFAULTS)

export const OVERLAY_IDS = ['none', 'dots', 'lines', 'honeycomb']

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function hex(value, fallback) {
  const v = String(value ?? '').trim()
  return HEX_RE.test(v) ? v.toLowerCase() : fallback
}

function num(value, fallback, min, max) {
  const n = parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// The URL ends up inside a CSS url("…"), so anything with quotes, parens or
// whitespace is rejected rather than escaped — and only https/relative paths
// are allowed, never javascript: or data:.
function safeUrl(value) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  if (/^\/[^\s'"()]*$/.test(v)) return v
  if (/^https:\/\/[^\s'"()]+$/.test(v)) return v
  return ''
}

// Turn raw app_settings strings into validated values ready to render.
export function normalizeBg(raw = {}) {
  return {
    from: hex(raw.bg_gradient_from, BG_DEFAULTS.bg_gradient_from),
    to: hex(raw.bg_gradient_to, BG_DEFAULTS.bg_gradient_to),
    angle: num(raw.bg_gradient_angle, 160, 0, 360),
    imageUrl: safeUrl(raw.bg_image_url),
    imageOpacity: num(raw.bg_image_opacity, 100, 0, 100),
    overlay: OVERLAY_IDS.includes(raw.bg_overlay) ? raw.bg_overlay : 'none',
    overlayColor: hex(raw.bg_overlay_color, BG_DEFAULTS.bg_overlay_color),
    overlayOpacity: num(raw.bg_overlay_opacity, 18, 0, 100),
  }
}

const round = n => Math.round(n * 1000) / 1000

// Fine dot grid.
function dotsSvg(color) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'>` +
    `<circle cx='1' cy='1' r='0.7' fill='${color}'/></svg>`
}

// 45° hairlines. The two corner stubs make the diagonal continue across the
// tile seam instead of breaking at every repeat.
function linesSvg(color) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'>` +
    `<path d='M0,6L6,0M-1,1L1,-1M5,7L7,5' stroke='${color}' stroke-width='0.6' fill='none'/></svg>`
}

// Honeycomb. Pointy-top hexagons sit on a staggered grid, so the tile also
// draws the neighbours that spill over its edges — without them the pattern
// would visibly break at every repeat.
function honeycombSvg(color) {
  const s = 8                  // hexagon side
  const w = Math.sqrt(3) * s   // tile width  ≈ 13.856
  const h = 3 * s              // tile height = 24
  const hx = w / 2
  const hexPath = (cx, cy) =>
    `M${round(cx)},${round(cy - s)}` +
    `L${round(cx + hx)},${round(cy - s / 2)}` +
    `L${round(cx + hx)},${round(cy + s / 2)}` +
    `L${round(cx)},${round(cy + s)}` +
    `L${round(cx - hx)},${round(cy + s / 2)}` +
    `L${round(cx - hx)},${round(cy - s / 2)}Z`
  const centers = [[0, 0], [w, 0], [0, h], [w, h], [hx, h / 2], [hx, -h / 2], [hx, h * 1.5]]
  const d = centers.map(([cx, cy]) => hexPath(cx, cy)).join('')
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${round(w)}' height='${h}' ` +
    `viewBox='0 0 ${round(w)} ${h}'>` +
    `<path d='${d}' fill='none' stroke='${color}' stroke-width='0.6'/></svg>`
}

// A repeatable data: URI for one of the overlay patterns, or '' for 'none'.
// Exported so the admin panel can paint the same swatch the page will show.
//
// encodeURIComponent leaves apostrophes alone, and the SVG uses them for its
// attributes — so they're escaped explicitly. Without that the URI breaks the
// moment it lands inside a url('…') rather than a url("…").
export function overlayDataUri(overlay, color) {
  const build = { dots: dotsSvg, lines: linesSvg, honeycomb: honeycombSvg }[overlay]
  if (!build) return ''
  return `data:image/svg+xml,${encodeURIComponent(build(color)).replace(/'/g, '%27')}`
}

// The <style> body injected into the order form.
export function buildBackgroundCss(raw) {
  const bg = normalizeBg(raw)
  const css = [
    `body{background:linear-gradient(${bg.angle}deg,${bg.from} 0%,${bg.to} 60%);` +
    `background-attachment:fixed}`,
  ]
  // Both layers sit at z-index 0 behind .page (z-index 1), matching how
  // order.css already stacks its own body::before/::after decoration.
  const base = 'position:fixed;inset:0;z-index:0;pointer-events:none;'
  if (bg.imageUrl) {
    css.push(`.bg-layer-image{${base}background-image:url("${bg.imageUrl}");` +
      `background-size:cover;background-position:center;background-repeat:no-repeat;` +
      `opacity:${bg.imageOpacity / 100}}`)
  }
  const uri = overlayDataUri(bg.overlay, bg.overlayColor)
  if (uri) {
    css.push(`.bg-layer-pattern{${base}background-image:url("${uri}");` +
      `background-repeat:repeat;opacity:${bg.overlayOpacity / 100}}`)
  }
  return css.join('')
}

// The matching layer elements. Only emitted when they'd actually paint
// something, so the default look stays exactly as it is today.
export function buildBackgroundLayers(raw) {
  const bg = normalizeBg(raw)
  let html = ''
  if (bg.imageUrl) html += '<div class="bg-layer-image"></div>'
  if (bg.overlay !== 'none') html += '<div class="bg-layer-pattern"></div>'
  return html
}
