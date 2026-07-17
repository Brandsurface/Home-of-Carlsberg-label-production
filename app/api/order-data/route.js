import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return Response.json({ error: 'Manglende id' }, { status: 400 })
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return Response.json({ error: 'Ordre ikke fundet' }, { status: 404 })
  }

  return Response.json({
    butiksnavn:    order.butiksnavn,
    navn:          order.navn,
    email:         order.email,
    delivery_date: order.delivery_date,

    brand:         order.brand,
    variant:       order.variant,
    size:          order.size,
    region:        order.region,
    label_type:    order.label_type,
    cutterguide:   order.cutterguide,
    finish:        order.finish,
    paper:         order.paper,
    energy_kj:     order.energy_kj,
    energy_kcal:   order.energy_kcal,
    units:         order.units,
    material_old:  order.material_old,
    material_new:  order.material_new,
    ean:           order.ean,
    pantmaerke:    order.pantmaerke,
    ingredients:   order.ingredients,

    andet:         order.andet,
    artwork_help:  order.artwork_help,
    smash_link:    order.smash_link,
    uploads:       order.uploads,
    revision:      order.revision,
  })
}
