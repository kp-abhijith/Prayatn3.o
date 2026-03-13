import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HOSPITALS, ALERTS, TRANSFER_REQUESTS, APPOINTMENT_REQUESTS } from '../data/mockData'
import ResourceBar from '../components/ResourceBar'
import AlertItem from '../components/AlertItem'
import UpdateModal from '../components/UpdateModal'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [activeHospital, setActiveHospital] = useState(0)
  const [alerts, setAlerts] = useState(ALERTS)
  const [hospitals, setHospitals] = useState(HOSPITALS)
  const [modal, setModal] = useState(null)
  const [transfers, setTransfers] = useState(TRANSFER_REQUESTS)
  const [appointments, setAppointments] = useState(APPOINTMENT_REQUESTS)

  const hospital = hospitals[activeHospital]

  const tabs = [
    { id:'overview',      label:'Overview',    icon:'📊' },
    { id:'resources',     label:'Resources',   icon:'🏥' },
    { id:'transfers',     label:'Transfers',   icon:'🔄' },
    { id:'appointments',  label:'Requests',    icon:'📋' },
    { id:'bloodbank',     label:'Blood Bank',  icon:'🩸' },
  ]

  // total stats across all hospitals
  const totalICU      = hospitals.reduce((s, h) => s + h.icuBeds.available, 0)
  const totalBeds     = hospitals.reduce((s, h) => s + h.generalBeds.available, 0)
  const totalAmb      = hospitals.reduce((s, h) => s + h.ambulances.available, 0)
  const criticalCount = alerts.filter(a => a.level === 'critical').length

  const handleSave = (type, category, itemLabel, newValue) => {
    setHospitals(prev => prev.map((h, i) => {
      if (i !== activeHospital) return h
      if (type === 'doctors') {
        return { ...h, doctors: { ...h.doctors, [itemLabel]: { ...h.doctors[itemLabel], available: newValue } } }
      }
      if (type === 'equipment') {
        return { ...h, equipment: { ...h.equipment, [itemLabel]: { ...h.equipment[itemLabel], available: newValue } } }
      }
      if (itemLabel === 'ICU Beds')     return { ...h, icuBeds:     { ...h.icuBeds,     available: newValue } }
      if (itemLabel === 'General Beds') return { ...h, generalBeds: { ...h.generalBeds, available: newValue } }
      if (itemLabel === 'Ambulances')   return { ...h, ambulances:  { ...h.ambulances,  available: newValue } }
      return h
    }))
    setModal(null)
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex' }}>

      {/* sidebar */}
      <div style={{ width:220, background:'var(--bg-surface)', borderRight:'1px solid var(--border-soft)', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 }}>

        {/* logo */}
        <div style={{ padding:'0 20px 24px', borderBottom:'1px solid var(--border-soft)' }}>
          <div style={{ fontSize:20, fontFamily:'Instrument Serif' }}>🏥 MediSync</div>
          <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Doctor Dashboard</div>
        </div>

        {/* hospital selector */}
        <div style={{ padding:'16px 12px', borderBottom:'1px solid var(--border-soft)' }}>
          <div style={{ fontSize:10, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, paddingLeft:8 }}>Your Hospital</div>
          {hospitals.map((h, i) => (
            <button key={h.id} onClick={() => setActiveHospital(i)} style={{ width:'100%', padding:'8px 10px', background: i === activeHospital ? 'rgba(212,132,90,0.1)' : 'transparent', border: i === activeHospital ? '1px solid rgba(212,132,90,0.2)' : '1px solid transparent', borderRadius:8, cursor:'pointer', textAlign:'left', marginBottom:4 }}>
              <div style={{ fontSize:12, fontWeight:600, color: i === activeHospital ? 'var(--warm)' : 'var(--text-primary)' }}>{h.name}</div>
              <div style={{ fontSize:10, color:'var(--text-faint)' }}>{h.location}</div>
            </button>
          ))}
        </div>

        {/* tabs */}
        <div style={{ padding:'12px 12px', flex:1 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ width:'100%', padding:'9px 10px', background: activeTab === tab.id ? 'rgba(212,132,90,0.08)' : 'transparent', border:'none', borderRadius:8, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <span style={{ fontSize:15 }}>{tab.icon}</span>
              <span style={{ fontSize:13, color: activeTab === tab.id ? 'var(--warm)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 600 : 400 }}>{tab.label}</span>
              {tab.id === 'transfers' && transfers.filter(t => t.status === 'incoming').length > 0 && (
                <span style={{ marginLeft:'auto', background:'var(--clay)', color:'#fff', fontSize:10, padding:'1px 6px', borderRadius:99 }}>{transfers.filter(t => t.status === 'incoming').length}</span>
              )}
            </button>
          ))}
        </div>

        {/* logout */}
        <div style={{ padding:'16px 12px', borderTop:'1px solid var(--border-soft)' }}>
          <button onClick={() => navigate('/')} style={{ width:'100%', padding:'9px 10px', background:'transparent', border:'1px solid var(--border-soft)', borderRadius:8, cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>← Sign Out</button>
        </div>
      </div>

      {/* main content */}
      <div style={{ flex:1, padding:'32px 36px', overflowY:'auto' }}>

        {/* header */}
        <div style={{ marginBottom:28 }}>
          <h2 style={{ fontSize:28, marginBottom:4 }}>{hospital.name}</h2>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>{hospital.location}</span>
            <span style={{ fontSize:11, padding:'3px 10px', background: hospital.status === 'critical' ? 'rgba(184,92,92,0.15)' : 'rgba(107,165,131,0.15)', color: hospital.status === 'critical' ? 'var(--clay)' : 'var(--sage)', border: `1px solid ${hospital.status === 'critical' ? 'rgba(184,92,92,0.3)' : 'rgba(107,165,131,0.3)'}`, borderRadius:99 }}>
              {hospital.status === 'critical' ? '⚠️ Critical' : '✅ Normal'}
            </span>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            {/* stat cards */}
            <div style={{ display:'flex', gap:16, marginBottom:28, flexWrap:'wrap' }}>
              {[
                { icon:'🛏️', label:'ICU Beds Available',  value:totalICU,      sub:'across all hospitals',  color:'var(--cool)'  },
                { icon:'🏥', label:'General Beds',        value:totalBeds,     sub:'across all hospitals',  color:'var(--sage)'  },
                { icon:'🚑', label:'Ambulances Ready',    value:totalAmb,      sub:'across all hospitals',  color:'var(--warm)'  },
                { icon:'🔴', label:'Critical Alerts',     value:criticalCount, sub:'need attention now',    color:'var(--clay)'  },
              ].map(card => (
                <div key={card.label} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:'20px 22px', flex:1, minWidth:160 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                    <div style={{ width:34, height:34, background:`${card.color}18`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{card.icon}</div>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{card.label}</span>
                  </div>
                  <div style={{ fontFamily:'Instrument Serif', fontSize:32, color:card.color, lineHeight:1 }}>{card.value}</div>
                  <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:6 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* alerts + transfers side by side */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

              {/* alerts */}
              <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
                  <span>Live Alerts</span>
                  <span style={{ fontSize:11, color:'var(--text-faint)' }}>{alerts.length} active</span>
                </div>
                {alerts.length === 0 && <div style={{ fontSize:13, color:'var(--text-faint)', textAlign:'center', padding:20 }}>No active alerts 🎉</div>}
                {alerts.map(a => (
                  <AlertItem key={a.id} {...a} onDismiss={() => setAlerts(prev => prev.filter(x => x.id !== a.id))} />
                ))}
              </div>

              {/* incoming transfers */}
              <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Transfer Requests</div>
                {transfers.map(t => (
                  <div key={t.id} style={{ padding:'12px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-soft)', borderRadius:10, marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{t.resource} × {t.qty}</span>
                      {t.urgent && <span style={{ fontSize:9, color:'var(--clay)', border:'1px solid rgba(184,92,92,0.3)', padding:'2px 7px', borderRadius:99, textTransform:'uppercase', letterSpacing:0.5 }}>Urgent</span>}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>
                      {t.status === 'incoming' ? `From: ${t.from}` : `To: ${t.to}`} · {t.time}
                    </div>
                    {t.status === 'incoming' && (
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => setTransfers(prev => prev.map(x => x.id === t.id ? { ...x, status:'approved' } : x))} style={{ flex:1, padding:'7px', background:'rgba(107,165,131,0.1)', border:'1px solid rgba(107,165,131,0.3)', borderRadius:8, color:'var(--sage)', cursor:'pointer', fontSize:12 }}>✓ Approve</button>
                        <button onClick={() => setTransfers(prev => prev.filter(x => x.id !== t.id))} style={{ flex:1, padding:'7px', background:'rgba(184,92,92,0.08)', border:'1px solid rgba(184,92,92,0.2)', borderRadius:8, color:'var(--clay)', cursor:'pointer', fontSize:12 }}>✗ Reject</button>
                      </div>
                    )}
                    {t.status === 'approved' && <div style={{ fontSize:12, color:'var(--sage)' }}>✓ Approved</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESOURCES TAB */}
        {activeTab === 'resources' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

            {/* beds + ambulances */}
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Beds & Ambulances</div>
              {[
                { icon:'🛏️', label:'ICU Beds',     available:hospital.icuBeds.available,     total:hospital.icuBeds.total     },
                { icon:'🛏️', label:'General Beds', available:hospital.generalBeds.available, total:hospital.generalBeds.total },
                { icon:'🚑', label:'Ambulances',   available:hospital.ambulances.available,  total:hospital.ambulances.total  },
              ].map(item => (
                <ResourceBar key={item.label} {...item} onUpdate={(label, available, total) => setModal({ label, available, total, type:'beds' })} />
              ))}
            </div>

            {/* doctors */}
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Doctors On Duty</div>
              {Object.entries(hospital.doctors).map(([name, data]) => (
                <ResourceBar key={name} icon={data.icon} label={name} available={data.available} total={data.total} onUpdate={(label, available, total) => setModal({ label, available, total, type:'doctors' })} />
              ))}
            </div>

            {/* equipment */}
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20, gridColumn:'span 2' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Equipment</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {Object.entries(hospital.equipment).map(([name, data]) => (
                  <ResourceBar key={name} icon={data.icon} label={name} available={data.available} total={data.total} onUpdate={(label, available, total) => setModal({ label, available, total, type:'equipment' })} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TRANSFERS TAB */}
        {activeTab === 'transfers' && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:24 }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>All Transfer Requests</div>
            {transfers.map(t => (
              <div key={t.id} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-soft)', borderRadius:10, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:14, fontWeight:600 }}>{t.resource} × {t.qty}</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {t.urgent && <span style={{ fontSize:9, color:'var(--clay)', border:'1px solid rgba(184,92,92,0.3)', padding:'2px 7px', borderRadius:99, textTransform:'uppercase' }}>Urgent</span>}
                    <span style={{ fontSize:11, color: t.status === 'incoming' ? 'var(--amber)' : t.status === 'approved' ? 'var(--sage)' : 'var(--text-muted)', padding:'3px 10px', background:'rgba(255,255,255,0.04)', borderRadius:99 }}>{t.status}</span>
                  </div>
                </div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:10 }}>
                  {t.status === 'incoming' ? `From: ${t.from}` : `To: ${t.to}`} · {t.time}
                </div>
                {t.status === 'incoming' && (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setTransfers(prev => prev.map(x => x.id === t.id ? { ...x, status:'approved' } : x))} style={{ padding:'8px 20px', background:'rgba(107,165,131,0.1)', border:'1px solid rgba(107,165,131,0.3)', borderRadius:8, color:'var(--sage)', cursor:'pointer', fontSize:13 }}>✓ Approve</button>
                    <button onClick={() => setTransfers(prev => prev.filter(x => x.id !== t.id))} style={{ padding:'8px 20px', background:'rgba(184,92,92,0.08)', border:'1px solid rgba(184,92,92,0.2)', borderRadius:8, color:'var(--clay)', cursor:'pointer', fontSize:13 }}>✗ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:24 }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Patient Appointment Requests</div>
            {appointments.map(a => (
              <div key={a.id} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-soft)', borderRadius:10, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:14, fontWeight:600 }}>{a.patient}</span>
                  <span style={{ fontSize:11, color:'var(--text-faint)' }}>{a.time}</span>
                </div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:4 }}>📞 {a.phone}</div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>💬 {a.symptoms}</div>
                {a.status === 'pending' && (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status:'confirmed' } : x))} style={{ padding:'8px 20px', background:'rgba(107,165,131,0.1)', border:'1px solid rgba(107,165,131,0.3)', borderRadius:8, color:'var(--sage)', cursor:'pointer', fontSize:13 }}>✓ Confirm</button>
                    <button onClick={() => setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status:'rescheduled' } : x))} style={{ padding:'8px 20px', background:'rgba(201,148,58,0.08)', border:'1px solid rgba(201,148,58,0.2)', borderRadius:8, color:'var(--amber)', cursor:'pointer', fontSize:13 }}>↺ Reschedule</button>
                  </div>
                )}
                {a.status !== 'pending' && <div style={{ fontSize:13, color: a.status === 'confirmed' ? 'var(--sage)' : 'var(--amber)' }}>● {a.status}</div>}
              </div>
            ))}
          </div>
        )}

        {/* BLOOD BANK TAB */}
        {activeTab === 'bloodbank' && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:24 }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Blood Bank — {hospital.name}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
              {Object.entries(hospital.bloodBank).map(([type, units]) => (
                <div key={type} style={{ padding:'18px 14px', background: units === 0 ? 'rgba(184,92,92,0.08)' : 'rgba(255,255,255,0.02)', border:`1px solid ${units === 0 ? 'rgba(184,92,92,0.25)' : 'var(--border-soft)'}`, borderRadius:12, textAlign:'center' }}>
                  <div style={{ fontFamily:'Instrument Serif', fontSize:28, color: units === 0 ? 'var(--clay)' : units <= 3 ? 'var(--amber)' : 'var(--sage)', marginBottom:4 }}>{units}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{type}</div>
                  <div style={{ fontSize:11, color:'var(--text-faint)' }}>units</div>
                  {units === 0 && <div style={{ fontSize:10, color:'var(--clay)', marginTop:6, textTransform:'uppercase', letterSpacing:0.5 }}>Out of Stock</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* update modal */}
      {modal && (
        <UpdateModal
          label={modal.label}
          current={modal.available}
          total={modal.total}
          onClose={() => setModal(null)}
          onSave={(val) => handleSave(modal.type, null, modal.label, val)}
        />
      )}

    </div>
  )
}
