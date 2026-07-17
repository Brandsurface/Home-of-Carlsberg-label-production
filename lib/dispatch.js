import { supabase } from '@/lib/supabase'
import { buildBrandsurfaceEmail } from '@/lib/emails'
import { sendEmail, cancelScheduled, hasMailKey } from '@/lib/brevo'

// Signed (7-day) download links for an order's uploaded files
export async function buildUploadLinks(order) {
  const ups = Array.isArray(order?.uploads) ? order.uploads : []
  const links = []
  for (const u of ups) {
    try {
      const { data } = await supabase.storage.from('order-uploads').createSignedUrl(u.path, 60 * 60 * 24 * 7)
      if (data?.signedUrl) links.push({ name: u.name, url: data.signedUrl, slot: u.slot })
    } catch (e) {
      console.warn('Kunne ikke lave download-link:', e?.message)
    }
  }
  return links
}

// Mark an order confirmed and send it to Brandsurface now.
// Cancels any pending scheduled send first so it can't fire twice.
// Never throws on a mail failure — the order is still confirmed.
export async function dispatchToBrandsurface(order) {
  await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id)
  try {
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'brandsurface_email')
      .single()
    const recipient = (setting?.value || process.env.BRANDSURFACE_EMAIL || '').trim()
    if (!hasMailKey() || !recipient) {
      console.warn('BREVO_API_KEY eller modtager mangler — ingen mail sendt til Brandsurface')
      return
    }
    // Cancel the pending scheduled send so Brevo doesn't also fire it later
    if (order.scheduled_email_id) await cancelScheduled(order.scheduled_email_id)

    const uploadLinks = await buildUploadLinks(order)
    const { subject, html } = buildBrandsurfaceEmail({ order: { ...order, uploadLinks } })
    await sendEmail({
      to: recipient,
      replyTo: order.email,
      senderName: 'Brandsurface Ordre',
      subject,
      html,
    })
  } catch (e) {
    console.error('Brandsurface dispatch mail-fejl:', e?.message)
  }
}

// Cancel a pending scheduled Brandsurface send (used when deleting an order)
export async function cancelScheduledSend(order) {
  if (order?.scheduled_email_id) await cancelScheduled(order.scheduled_email_id)
}
