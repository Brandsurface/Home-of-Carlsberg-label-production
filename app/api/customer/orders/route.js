import { supabase } from '@/lib/supabase'
import { getCustomerUser } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

// Returns the logged-in customer's own orders (filtered by their verified email).
// The email filter IS the access-control boundary — never trust a query param.
export async function GET() {
  const me = await getCustomerUser()
  if (!me) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, status, butiksnavn, brand, variant, size, region, revision, send_after')
    .ilike('email', me.email) // case-insensitive exact (me.email is lowercased)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return Response.json({ error: 'db' }, { status: 500 })
  return Response.json({ orders: data || [] })
}
