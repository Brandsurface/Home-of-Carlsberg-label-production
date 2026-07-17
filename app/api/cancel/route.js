import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.redirect(`${origin}/?error=missing-id`)
  }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.redirect(`${origin}/?error=not-found`)
  }

  if (order.status === 'confirmed') {
    return NextResponse.redirect(`${origin}/godkendt?already=1`)
  }

  // Markér som cancelled
  await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', id)

  // Send tilbage til formularen med edit-id, så data kan genindlæses
  return NextResponse.redirect(`${origin}/?edit=${id}`)
}
