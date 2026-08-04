import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/admin-auth'
import { hasPodioConfig, testPodioConnection } from '@/lib/podio'

export const dynamic = 'force-dynamic'

// Tests the OAuth credentials (env vars) and, if an App ID is given, that the
// app is reachable and which of the submitted field ids it actually has.
// Reads the *unsaved* values straight from the settings form, so an admin can
// check a change before saving it.
export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPodioConfig()) {
    return NextResponse.json({ error: 'Podio is not configured (missing PODIO_* env vars).' }, { status: 400 })
  }

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const appId = String(body.appId || '').trim()

  try {
    const { appName, fields } = await testPodioConnection({
      appId,
      fieldIds: {
        job_no: String(body.fieldJobNo || '').trim(),
        job_name: String(body.fieldJobName || '').trim(),
        responsible: String(body.fieldResponsible || '').trim(),
      },
    })
    return NextResponse.json({ success: true, appName, fields })
  } catch (e) {
    console.error('[podio] test error:', e?.message)
    return NextResponse.json({ error: e.message || 'Podio error' }, { status: 502 })
  }
}
