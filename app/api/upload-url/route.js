import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BUCKET = 'order-uploads'
const ALLOWED = ['pdf', 'ai', 'eps', 'psd', 'indd', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'tif', 'tiff', 'zip', 'mp4']

// Mint a short-lived signed URL the browser can PUT a file directly to,
// so large files never pass through the (size-limited) serverless function.
export async function POST(req) {
  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request' }, { status: 400 }) }

  const filename = String(body?.filename || '').trim()
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
  if (!filename || !ALLOWED.includes(ext)) {
    return Response.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const path = `${crypto.randomUUID()}/${safe}`

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) {
    console.error('createSignedUploadUrl fejl:', error.message)
    return Response.json({ error: 'Could not prepare upload' }, { status: 500 })
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const uploadUrl = data.signedUrl.startsWith('http') ? data.signedUrl : base + data.signedUrl
  return Response.json({ uploadUrl, path })
}
