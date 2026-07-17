// Podio integration — user (password) OAuth flow + item creation.
// Credentials come from env vars; the target app id + field mappings live
// in app_settings (editable from Admin → Settings).

const AUTH_URL = 'https://podio.com/oauth/token'
const API_BASE = 'https://api.podio.com'

// In-memory token cache (per server instance). Podio tokens last ~8h.
let cached = null // { token, expiresAt }

export function hasPodioConfig() {
  return !!(
    process.env.PODIO_CLIENT_ID &&
    process.env.PODIO_CLIENT_SECRET &&
    process.env.PODIO_USERNAME &&
    process.env.PODIO_PASSWORD
  )
}

async function getAccessToken() {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: process.env.PODIO_CLIENT_ID,
    client_secret: process.env.PODIO_CLIENT_SECRET,
    username: process.env.PODIO_USERNAME,
    password: process.env.PODIO_PASSWORD,
  })

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error('Podio login failed: ' + (data.error_description || data.error || res.status))
  }
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 28800) * 1000 }
  return cached.token
}

// Create an item (job) in a Podio app.
// `fields` is a map of field external_id → value in Podio's "simple" format
// (text fields take a string, contact fields take an array of profile ids).
export async function createPodioItem({ appId, fields }) {
  const token = await getAccessToken()
  const res = await fetch(`${API_BASE}/item/app/${appId}/`, {
    method: 'POST',
    headers: { Authorization: `OAuth2 ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error('Podio create failed: ' + (data.error_description || data.error || `HTTP ${res.status}`))
  }
  return { itemId: data.item_id, link: data.link || null }
}
