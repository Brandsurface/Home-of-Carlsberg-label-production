// Node-only customer auth helpers (current-customer lookup + small utilities).
// Mirrors lib/admin-auth.js but for the self-signup customer accounts.
// Password hashing reuses the generic scrypt helpers from lib/admin-auth.

import { cookies } from 'next/headers'
import { randomInt, timingSafeEqual } from 'node:crypto'
import { supabase } from '@/lib/supabase'
import { verifySessionToken } from '@/lib/session'

export const CUSTOMER_COOKIE = 'bs_customer'

// Returns the logged-in customer ({ id, email, email_verified }) or null.
// Re-checks email_verified on every request, so an unverified account never
// counts as logged in even if it somehow holds a token.
export async function getCustomerUser() {
  const secret = process.env.CUSTOMER_SESSION_SECRET
  if (!secret) return null
  const token = cookies().get(CUSTOMER_COOKIE)?.value
  const session = await verifySessionToken(token, secret)
  if (!session?.uid) return null
  const { data } = await supabase
    .from('customers')
    .select('id, email, email_verified')
    .eq('id', session.uid)
    .single()
  if (!data || !data.email_verified) return null
  return data
}

// 6-digit crypto-random code, zero-padded.
export function genVerifyCode() {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}

// Constant-time string compare (lengths may differ).
export function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a == null ? '' : a))
  const bb = Buffer.from(String(b == null ? '' : b))
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}
