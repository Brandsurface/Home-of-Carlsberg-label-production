import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/admin-auth'
import { createPodioItem, hasPodioConfig } from '@/lib/podio'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPodioConfig()) {
    return NextResponse.json({ error: 'Podio is not configured (missing PODIO_* env vars).' }, { status: 400 })
  }

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const orderId = String(body.orderId || '')
  const jobNo = String(body.jobNo || '').trim()
  const jobName = String(body.jobName || '').trim()
  const employeeId = body.employeeId != null ? String(body.employeeId).trim() : ''

  if (!orderId) return NextResponse.json({ error: 'Missing order.' }, { status: 400 })
  if (!/^\d{6}$/.test(jobNo)) return NextResponse.json({ error: 'Job number must be 6 digits.' }, { status: 400 })
  if (!jobName) return NextResponse.json({ error: 'Job name is required.' }, { status: 400 })

  // Pull Podio config from settings
  const { data: settingRows } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['podio_app_id', 'podio_field_job_no', 'podio_field_job_name', 'podio_field_responsible', 'podio_employees'])
  const s = Object.fromEntries((settingRows || []).map(r => [r.key, r.value]))

  const appId = String(s.podio_app_id || '').trim()
  if (!appId) return NextResponse.json({ error: 'Podio App ID is not set in Settings.' }, { status: 400 })

  const fJobNo = String(s.podio_field_job_no || '').trim()
  const fJobName = String(s.podio_field_job_name || '').trim()
  const fResp = String(s.podio_field_responsible || '').trim()

  const fields = {}
  if (fJobNo) fields[fJobNo] = jobNo
  if (fJobName) fields[fJobName] = jobName

  // Resolve the selected employee → Podio profile id (for a contact field)
  if (employeeId && fResp) {
    let employees = []
    try { employees = JSON.parse(s.podio_employees || '[]') } catch {}
    const emp = employees.find(e => String(e.podio_id) === employeeId || e.name === employeeId)
    if (emp && emp.podio_id) fields[fResp] = [Number(emp.podio_id)]
  }

  try {
    const { itemId, link } = await createPodioItem({ appId, fields })
    await supabase.from('orders').update({
      podio_item_id: itemId,
      podio_job_no: jobNo,
      podio_job_name: jobName,
      podio_link: link,
    }).eq('id', orderId)
    return NextResponse.json({ success: true, itemId, link })
  } catch (e) {
    console.error('[podio] create error:', e?.message)
    return NextResponse.json({ error: e.message || 'Podio error' }, { status: 502 })
  }
}
