import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function row(label, value) {
  if (!value && value !== 0) return ''
  return `${label}: ${String(value).trim()}\n`
}

// Combine the two energy values into one readable line (drops empties).
function energyText(o) {
  const kj = o.energy_kj != null && String(o.energy_kj).trim() !== '' ? String(o.energy_kj).trim() + ' kJ' : ''
  const kcal = o.energy_kcal != null && String(o.energy_kcal).trim() !== '' ? String(o.energy_kcal).trim() + ' kcal' : ''
  return [kj, kcal].filter(Boolean).join(' / ')
}

// Strip bold markers → clean plain text (decode the entities we stored).
function stripBold(s) {
  return String(s == null ? '' : s)
    .replace(/<\s*\/?\s*(b|strong)\s*>/gi, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&')
}
function boldList(s) {
  const out = []
  const re = /<\s*(b|strong)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi
  let m
  while ((m = re.exec(String(s || ''))) !== null) {
    const t = stripBold(m[2]).trim()
    if (t) out.push(t)
  }
  return out.filter((v, i) => out.indexOf(v) === i)
}

function section(title, lines) {
  const body = lines.filter(Boolean).join('')
  if (!body) return ''
  return `\n${title}\n${'─'.repeat(title.length)}\n${body}`
}

// Group uploaded files under their upload category, keeping the slot display order.
function groupUploadsBySlot(files) {
  const order = ['cutterguide', 'ingredients', 'additional', 'artwork']
  const labels = { cutterguide: 'Cutterguide', ingredients: 'Ingredients & nutrition', additional: 'Additional information', artwork: 'Artwork' }
  const list = Array.isArray(files) ? files : []
  return order
    .map(slot => ({ label: labels[slot], files: list.filter(f => (order.includes(f.slot) ? f.slot : 'artwork') === slot) }))
    .filter(g => g.files.length)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return new Response('Missing id', { status: 400 })

  const { data: o, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !o) return new Response('Order not found', { status: 404 })

  const deadline = o.delivery_date
    ? new Date(o.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  const lines = [
    `BRAND SURFACE — CAN ORDER BRIEF\n${'═'.repeat(32)}`,
    `\nOrder ID: ${o.id}`,
    `Submitted: ${new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    o.revision > 0 ? `Revision: ${o.revision}` : '',

    section('ORDERER', [
      row('Campaign / Project', o.butiksnavn),
      row('Name', o.navn),
      row('Email', o.email),
      row('Deadline', deadline),
    ]),

    section('CAN BRIEF', [
      row('Brand', o.brand),
      row('Variant', o.variant),
      row('Size', o.size),
      row('Region', o.region),
      row('Print Type', o.label_type),
      row('Paper', o.paper),
      row('Finish', o.finish),
      row('Energy / 100 ml', energyText(o)),
      row('Number of units', o.units),
      row('Cutterguide', o.cutterguide),
    ]),

    section('PRODUCTION', [
      row('Material No. (old)', o.material_old),
      row('Material No. (new)', o.material_new),
      row('EAN', o.ean),
      String(o.region || '').toLowerCase() !== 'border' ? row('Deposit mark', o.pantmaerke ? 'Yes' : 'No') : '',
      row('Ingredients / Nutrition', stripBold(o.ingredients)),
      boldList(o.ingredients).length ? row('Marked in bold', boldList(o.ingredients).join(', ')) : '',
    ]),

    o.andet ? section('ADDITIONAL INFORMATION', [`${String(o.andet).trim()}\n`]) : '',

    section('ARTWORK', [
      o.artwork_help ? 'Artwork help: Requested\n' : '',
      o.smash_link   ? 'Smash link: Requested\n' : '',
    ]),

    o.uploads?.length
      ? section('FILES', groupUploadsBySlot(o.uploads).flatMap(g => [`${g.label}:\n`, ...g.files.map(f => `  - ${f.name}\n`)]))
      : '',

    `\n${'─'.repeat(32)}\nBrandsurface | brandsurface.dk\n`,
  ]

  const text = lines.filter(Boolean).join('\n')

  const campaign = (o.butiksnavn || 'order').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const filename = `bs-order-${campaign}-${o.id.slice(0, 8)}.txt`

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
