'use client'

import { useState } from 'react'

// Editable list of employees ({ name, podio_id }). Emits a hidden input
// (JSON array) under `name`. Used for the Podio "responsible" dropdown.
export default function EmployeeBuilder({ initial, name, nameLabel, idLabel, addLabel }) {
  const [rows, setRows] = useState(() =>
    Array.isArray(initial) && initial.length ? initial.map(r => ({ name: r.name || '', podio_id: r.podio_id || '' })) : [{ name: '', podio_id: '' }]
  )

  const set = (i, k, v) => { const n = rows.slice(); n[i] = { ...n[i], [k]: v }; setRows(n) }
  const add = () => setRows([...rows, { name: '', podio_id: '' }])
  const rem = i => { const n = rows.filter((_, x) => x !== i); setRows(n.length ? n : [{ name: '', podio_id: '' }]) }

  const clean = rows
    .map(r => ({ name: String(r.name || '').trim(), podio_id: String(r.podio_id || '').trim() }))
    .filter(r => r.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name={name} value={JSON.stringify(clean)} readOnly />
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="a-input" placeholder={nameLabel} value={r.name} onChange={e => set(i, 'name', e.target.value)} />
          <input className="a-input" placeholder={idLabel} value={r.podio_id} onChange={e => set(i, 'podio_id', e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 160 }} />
          <button type="button" className="og-del" title="Remove" onClick={() => rem(i)}>×</button>
        </div>
      ))}
      <button type="button" className="og-add-opt" style={{ alignSelf: 'flex-start' }} onClick={add}>{addLabel || '+ Add'}</button>
    </div>
  )
}
