// Edge-safe signed session tokens (Web Crypto only — no Node APIs / Buffer).
// Used by both the Edge middleware and Node route handlers.

export const SESSION_COOKIE = 'bs_admin'
const ALG = { name: 'HMAC', hash: 'SHA-256' }
const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0
  str += '='.repeat(pad)
  const bin = atob(str)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function importKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), ALG, false, ['sign', 'verify'])
}

export async function createSessionToken(payload, secret, maxAgeSec = 60 * 60 * 8) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSec }
  const data = toB64url(enc.encode(JSON.stringify(body)))
  const sig = await crypto.subtle.sign(ALG, await importKey(secret), enc.encode(data))
  return data + '.' + toB64url(new Uint8Array(sig))
}

export async function verifySessionToken(token, secret) {
  if (!token || !secret || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  let ok = false
  try {
    ok = await crypto.subtle.verify(ALG, await importKey(secret), fromB64url(sig), enc.encode(data))
  } catch {
    return null
  }
  if (!ok) return null
  let body
  try {
    body = JSON.parse(dec.decode(fromB64url(data)))
  } catch {
    return null
  }
  if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null
  return body
}
