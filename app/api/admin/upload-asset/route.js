import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const BUCKET = 'site-assets'
const ALLOWED = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg']

// Mint a short-lived signed URL the admin's browser can PUT a design asset
// directly to, mirroring /api/upload-url so large images never pass through
// the (size-limited) serverless function. Unlike order uploads this bucket is
// public, so the returned publicUrl is stable and safe to store in settings.
export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request' }, { status: 400 }) }

  const filename = String(body?.filename || '').trim()
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
  if (!filename || !ALLOWED.includes(ext)) {
    return Response.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const path = `background/${crypto.randomUUID()}/${safe}`

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) {
    console.error('createSignedUploadUrl (site-assets) fejl:', error.message)
    return Response.json({ error: 'Could not prepare upload' }, { status: 500 })
  }

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const uploadUrl = data.signedUrl.startsWith('http') ? data.signedUrl : base + data.signedUrl
  const publicUrl = `${base}/storage/v1/object/public/${BUCKET}/${path}`
  return Response.json({ uploadUrl, path, publicUrl })
}
