'use client'

import { useEffect, useState } from 'react'

// One modal mounted on the orders page. Opens when any `.podio-btn` button is
// clicked (buttons carry data-order-id / data-campaign). Posts to /api/admin/podio.
export default function PodioModal({ employees = [], t }) {
  const [open, setOpen] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [jobNo, setJobNo] = useState('')
  const [jobName, setJobName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function onClick(e) {
      const btn = e.target.closest('.podio-btn')
      if (!btn) return
      e.preventDefault()
      setOrderId(btn.dataset.orderId || '')
      setJobName(btn.dataset.campaign || '')
      setJobNo('')
      setEmployeeId('')
      setError('')
      setBusy(false)
      setOpen(true)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function submit() {
    setError('')
    if (!/^\d{6}$/.test(jobNo)) { setError(t.podio_err_jobno); return }
    if (!jobName.trim()) { setError(t.podio_err_jobname); return }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/podio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, jobNo, jobName, employeeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      window.location.reload()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="podio-overlay" onClick={e => { if (e.target.classList.contains('podio-overlay') && !busy) setOpen(false) }}>
      <div className="podio-modal">
        <div className="podio-modal-head">
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{t.podio_modal_title}</h3>
          <button type="button" className="podio-x" onClick={() => !busy && setOpen(false)} aria-label={t.podio_cancel}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="a-label">{t.podio_jobno_label}</label>
            <input className="a-input" inputMode="numeric" maxLength={6} placeholder="123456"
              value={jobNo} onChange={e => setJobNo(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="a-label">{t.podio_jobname_label}</label>
            <input className="a-input" value={jobName} onChange={e => setJobName(e.target.value)} />
          </div>

          {employees.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="a-label">{t.podio_employee_label}</label>
              <select className="a-input" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                <option value="">{t.podio_employee_none}</option>
                {employees.map((emp, i) => (
                  <option key={i} value={emp.podio_id || emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="a-note err" style={{ margin: 0 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="a-btn-2" onClick={() => setOpen(false)} disabled={busy}>{t.podio_cancel}</button>
            <button type="button" className="a-btn" onClick={submit} disabled={busy}>
              {busy ? t.podio_creating : t.podio_create}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
