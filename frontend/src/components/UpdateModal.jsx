import { useState } from 'react'

export default function UpdateModal({ label, current, total, onClose, onSave }) {
  const [value, setValue] = useState(current)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'var(--bg-raised)', border:'1px solid var(--border-medium)', borderRadius:16, padding:'32px 28px', width:340 }}>
        <h3 style={{ fontSize:20, marginBottom:6 }}>Update {label}</h3>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>Total capacity: {total}</p>

        <label style={{ display:'block', fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--text-faint)', marginBottom:8 }}>Available Now</label>
        <input
          type="number"
          min={0} max={total}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
          style={{ width:'100%', padding:'12px 14px', background:'var(--bg-base)', border:'1px solid var(--border-medium)', borderRadius:10, color:'var(--text-primary)', fontSize:18, fontFamily:'Instrument Serif', marginBottom:20 }}
        />

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, background:'transparent', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-muted)', cursor:'pointer' }}>Cancel</button>
          <button onClick={() => onSave(value)} style={{ flex:1, padding:12, background:'var(--warm)', border:'none', borderRadius:10, color:'#0e0c14', fontWeight:600, cursor:'pointer' }}>Save →</button>
        </div>
      </div>
    </div>
  )
}