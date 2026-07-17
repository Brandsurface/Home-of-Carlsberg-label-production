'use client'

import { useState } from 'react'

// Editable list of plain strings. Emits a hidden input (JSON array) under `name`.
// Used for brand variants and for the can option lists (sizes, regions, etc.).
export default function ListBuilder({ initial, name, placeholder, addLabel }) {
  const [items, setItems] = useState(() => (Array.isArray(initial) && initial.length ? initial.map(String) : ['']))

  const setItem = (i, v) => { const next = items.slice(); next[i] = v; setItems(next) }
  const addItem = () => setItems([...items, ''])
  const removeItem = i => { const next = items.filter((_, x) => x !== i); setItems(next.length ? next : ['']) }

  const clean = items.map(s => String(s).trim()).filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input type="hidden" name={name} value={JSON.stringify(clean)} readOnly />
      {items.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="a-input" placeholder={placeholder} value={v} onChange={e => setItem(i, e.target.value)} />
          <button type="button" className="og-del" title="Remove" onClick={() => removeItem(i)}>×</button>
        </div>
      ))}
      <button type="button" className="og-add-opt" style={{ alignSelf: 'flex-start' }} onClick={addItem}>{addLabel || '+ Add'}</button>
    </div>
  )
}
