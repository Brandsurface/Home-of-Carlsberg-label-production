import { supabase } from '@/lib/supabase'
import { buildCustomerConfirmEmail, buildBrandsurfaceEmail } from '@/lib/emails'
import { dispatchToBrandsurface, buildUploadLinks } from '@/lib/dispatch'
import { sendEmail, cancelScheduled, hasMailKey } from '@/lib/brevo'

export const dynamic = 'force-dynamic'

async function getSettings() {
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['brandsurface_email', 'confirm_delay_minutes'])
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  const delay = parseInt(map.confirm_delay_minutes, 10)
  return {
    recipient: (map.brandsurface_email || process.env.BRANDSURFACE_EMAIL || '').trim(),
    delayMinutes: Number.isFinite(delay) && delay >= 0 ? delay : 10,
  }
}

// Returns the name of the column a Supabase/Postgres error complains is missing,
// or null if the error is something else.
function missingColumnName(error) {
  if (!error) return null
  const msg = String(error.message || '') + ' ' + String(error.details || '')
  // PostgREST schema cache: "Could not find the 'paper' column of 'orders' …"
  let m = msg.match(/Could not find the '([^']+)' column/i)
  if (m) return m[1]
  // Postgres 42703: column "paper" of relation "orders" does not exist
  m = msg.match(/column "([^"]+)" of relation/i)
  if (m) return m[1]
  return null
}

// Insert an order, gracefully dropping any column the live database doesn't have
// yet (e.g. a new field whose migration hasn't been run). This keeps an order
// from failing entirely just because the schema is a step behind the code.
async function insertOrder(row) {
  let payload = { ...row }
  for (let attempt = 0; attempt < 12; attempt++) {
    const { data, error } = await supabase.from('orders').insert(payload).select().single()
    if (!error) return { data, error: null }
    const col = missingColumnName(error)
    if (col && Object.prototype.hasOwnProperty.call(payload, col)) {
      console.warn(`orders insert: kolonnen "${col}" findes ikke i databasen — gemmer ordren uden den (kør migrationen for at bevare feltet)`)
      delete payload[col]
      continue
    }
    return { data: null, error }
  }
  return { data: null, error: { message: 'For mange manglende kolonner ved insert' } }
}

export async function POST(request) {
  try {
    const body = await request.json()

    // Validation
    if (!body.butiksnavn || !body.navn || !body.email) {
      return Response.json({ error: 'Manglende påkrævede felter' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return Response.json({ error: 'Ugyldig e-mailadresse' }, { status: 400 })
    }

    // Determine revision + cancel any previously scheduled send when editing
    let revision = 0
    if (body.previous_id) {
      const { data: prev } = await supabase
        .from('orders')
        .select('revision, scheduled_email_id')
        .eq('id', body.previous_id)
        .single()
      if (prev) {
        revision = (prev.revision || 0) + 1
        if (prev.scheduled_email_id) await cancelScheduled(prev.scheduled_email_id)
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', body.previous_id)
      }
    }

    // Save order
    const { data: order, error: dbError } = await insertOrder({
      butiksnavn:    body.butiksnavn,
      navn:          body.navn,
      email:         body.email,
      delivery_date: body.delivery_date || null,

      brand:         body.brand || null,
      variant:       body.variant || null,
      size:          body.size || null,
      region:        body.region || null,
      label_type:    body.label_type || null,
      cutterguide:   body.cutterguide || null,
      finish:        body.finish || null,
      paper:         body.paper || null,
      energy_kj:     body.energy_kj || null,
      energy_kcal:   body.energy_kcal || null,
      units:         body.units || null,
      material_old:  body.material_old || null,
      material_new:  body.material_new || null,
      ean:           body.ean || null,
      pantmaerke:    !!body.pantmaerke,
      ingredients:   body.ingredients || null,

      andet:         body.andet || null,
      artwork_help:  !!body.artwork_help,
      smash_link:    !!body.smash_link,
      uploads:       Array.isArray(body.uploads) ? body.uploads : [],

      language:      ['en', 'da'].includes(body.language) ? body.language : 'en',
      status:        'pending',
      revision,
    })

    if (dbError) {
      console.error('Supabase INSERT fejl:', dbError)
      return Response.json({ error: 'Database fejl' }, { status: 500 })
    }

    if (!hasMailKey()) {
      console.error('BREVO_API_KEY mangler')
      return Response.json({ error: 'Mail-service ikke konfigureret' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
    const { recipient, delayMinutes } = await getSettings()

    // 1) Send order confirmation to the customer immediately
    try {
      const { subject, html } = buildCustomerConfirmEmail({ order, baseUrl, delayMinutes })
      await sendEmail({ to: order.email, senderName: 'Brandsurface', subject, html })
    } catch (mailError) {
      console.error('Brevo fejl (kundebekræftelse):', mailError?.message)
      return Response.json({ success: true, orderId: order.id, warning: 'Ordre gemt, men bekræftelsesmail kunne ikke sendes' })
    }

    // 2) Forward to Brandsurface — immediately when no delay, otherwise scheduled
    if (recipient) {
      if (delayMinutes <= 0) {
        await dispatchToBrandsurface(order)
      } else {
        const sendAfter = new Date(Date.now() + delayMinutes * 60 * 1000)
        const batchId = crypto.randomUUID()
        try {
          const uploadLinks = await buildUploadLinks(order)
          const bs = buildBrandsurfaceEmail({ order: { ...order, uploadLinks } })
          await sendEmail({
            to: recipient,
            replyTo: order.email,
            senderName: 'Brandsurface Ordre',
            subject: bs.subject,
            html: bs.html,
            scheduledAt: sendAfter,
            batchId,
          })
          await supabase
            .from('orders')
            .update({ send_after: sendAfter.toISOString(), scheduled_email_id: batchId })
            .eq('id', order.id)
        } catch (e) {
          console.error('Planlægning af Brandsurface-mail fejlede:', e?.message)
        }
      }
    } else {
      console.warn('Ingen Brandsurface-modtager konfigureret — ingen ordremail planlagt')
    }

    return Response.json({ success: true, orderId: order.id, delayMinutes })

  } catch (err) {
    console.error('Uventet fejl i /api/order:', err)
    return Response.json({ error: 'Server fejl: ' + err.message }, { status: 500 })
  }
}
