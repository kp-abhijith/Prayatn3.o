export default function AlertItem({ msg, level, time, onDismiss }) {
  const colors = {
    critical: { bg: 'rgba(184,92,92,0.08)', border: 'rgba(184,92,92,0.25)', color: 'var(--clay)' },
    warning:  { bg: 'rgba(201,148,58,0.08)', border: 'rgba(201,148,58,0.25)', color: 'var(--amber)' },
    success:  { bg: 'rgba(107,165,131,0.08)', border: 'rgba(107,165,131,0.25)', color: 'var(--sage)' },
  }
  const icons = { critical: '🔴', warning: '🟡', success: '🟢' }
  const c = colors[level]

  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:c.bg, border:`1px solid ${c.border}`, borderRadius:10, marginBottom:8 }}>
      <span style={{ fontSize:12, marginTop:1 }}>{icons[level]}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, color:'var(--text-primary)' }}>{msg}</div>
        <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:3 }}>{time}</div>
      </div>
      <button onClick={onDismiss} style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:16, padding:0 }}>×</button>
    </div>
  )
}