import { supabase } from '@/lib/supabase'
import { dispatchToBrandsurface } from '@/lib/dispatch'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.redirect(`${origin}/godkendt?error=missing-id`)
  }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.redirect(`${origin}/godkendt?error=not-found`)
  }

  if (order.status === 'confirmed') {
    return NextResponse.redirect(`${origin}/godkendt?already=1`)
  }

  if (order.status === 'cancelled') {
    return NextResponse.redirect(`${origin}/godkendt?error=cancelled`)
  }

  await dispatchToBrandsurface(order)

  return NextResponse.redirect(`${origin}/godkendt`)
}
