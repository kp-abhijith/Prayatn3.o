import { useState } from 'react'

// ResourceBar — used everywhere in the dashboard
// shows a single resource (ICU beds, ventilators etc.) as a progress bar
// props:
//   icon     → emoji for the resource
//   label    → name of resource
//   available → how many are free right now
//   total    → total count
//   onUpdate → function to call when doctor clicks Update
//              if NOT passed, Update button won't show (patient view)

export default function ResourceBar({ icon, label, available, total, onUpdate }) {

  const [hovered, setHovered] = useState(false)

  // decides bar color based on how much is available
  // red = basically empty, amber = getting low, green = we're fine
  const getColor = () => {
    const ratio = available / total
    if (ratio === 0)    return 'var(--clay)'
    if (ratio <= 0.15)  return 'var(--clay)'
    if (ratio <= 0.35)  return 'var(--amber)'
    return 'var(--sage)'
  }

  const color = getColor()
  const percentage = Math.round((available / total) * 100)
  const isCritical = available === 0

  return (
    <div style={{
      padding: '12px 14px',
      background: isCritical
        ? 'rgba(184,92,92,0.06)'
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isCritical
        ? 'rgba(184,92,92,0.2)'
        : 'var(--border-soft)'}`,
      borderRadius: 10,
      marginBottom: 8,
    }}>

      {/* top row — label + count + update button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>

        {/* left side — icon + label + critical badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{
            fontSize: 13,
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}>{label}</span>

          {/* only shows when completely unavailable */}
          {isCritical && (
            <span style={{
              fontSize: 9,
              background: 'rgba(184,92,92,0.2)',
              color: 'var(--clay)',
              border: '1px solid rgba(184,92,92,0.3)',
              padding: '2px 7px',
              borderRadius: 99,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>Unavailable</span>
          )}
        </div>

        {/* right side — count + update button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color,
          }}>{available}/{total}</span>

          {/* update button — only shows for doctors, not patients */}
          {onUpdate && (
            <button
              onClick={() => onUpdate(label, available, total)}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                fontSize: 11,
                padding: '3px 10px',
                background: hovered
                  ? 'rgba(212,132,90,0.15)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${hovered
                  ? 'rgba(212,132,90,0.4)'
                  : 'var(--border-soft)'}`,
                borderRadius: 6,
                color: hovered ? 'var(--warm)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >Update</button>
          )}
        </div>
      </div>

      {/* progress bar */}
      <div style={{
        height: 5,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 99,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: color,
          borderRadius: 99,
          transition: 'width 0.6s ease',
          // subtle glow on the bar
          boxShadow: `0 0 6px ${color}66`,
        }}/>
      </div>

    </div>
  )
}