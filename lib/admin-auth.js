// Node-only admin auth helpers (password hashing + current-user lookup).
// Imported only from Node route handlers / server components — never Edge middleware.

import { cookies } from 'next/headers'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { supabase } from '@/lib/supabase'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

export function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return salt.toString('hex') + ':' + hash.toString('hex')
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [saltHex, hashHex] = stored.split(':')
  const hash = Buffer.from(hashHex, 'hex')
  const test = scryptSync(password, Buffer.from(saltHex, 'hex'), 64)
  return hash.length === test.length && timingSafeEqual(hash, test)
}

// Returns the logged-in admin user ({ id, email, is_master }) or null.
export async function getCurrentUser() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return null
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = await verifySessionToken(token, secret)
  if (!session?.uid) return null
  const { data } = await supabase
    .from('admin_users')
    .select('id, email, is_master')
    .eq('id', session.uid)
    .single()
  return data || null
}
