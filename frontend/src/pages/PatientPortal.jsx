import { useState } from 'react'
import { HOSPITALS, DONORS } from '../data/mockData'

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState('hospitals')
  const [location, setLocation] = useState('')
  const [locationSet, setLocationSet] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role:'bot', text:"Hi! I'm MediSync AI 👋 Describe your symptoms and I'll suggest which specialist and hospital to visit." }
  ])
  const [chatInput, setChatInput] = useState('')
  const [bloodFilter, setBloodFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [appointmentModal, setAppointmentModal] = useState(null)
  const [appointmentForm, setAppointmentForm] = useState({ name:'', phone:'', time:'Morning', symptoms:'' })
  const [appointmentSent, setAppointmentSent] = useState(false)

  const tabs = [
    { id:'hospitals', label:'Hospitals',    icon:'🏥' },
    { id:'chatbot',   label:'AI Assistant', icon:'🤖' },
    { id:'blood',     label:'Blood Finder', icon:'🩸' },
  ]

  // mock distances based on location input — Day 3 replace with real Maps API
  const getMockDistance = (hospitalLocation, userLocation) => {
    const loc = userLocation.toLowerCase()
    const hLoc = hospitalLocation.toLowerCase()
    if (hLoc.includes(loc) || loc.includes(hLoc)) return 2
    const distanceMap = {
      'new delhi':   { 'gurugram': 32, 'noida': 18 },
      'gurugram':    { 'new delhi': 32, 'noida': 48 },
      'noida':       { 'new delhi': 18, 'gurugram': 48 },
      'delhi':       { 'gurugram': 32, 'noida': 18 },
      'south delhi': { 'gurugram': 18, 'noida': 28 },
      'east delhi':  { 'noida': 12, 'gurugram': 40 },
    }
    for (const [key, dists] of Object.entries(distanceMap)) {
      if (loc.includes(key) || key.includes(loc)) {
        for (const [hKey, dist] of Object.entries(dists)) {
          if (hLoc.includes(hKey)) return dist
        }
      }
    }
    return Math.floor(Math.random() * 25) + 10
  }

  const hospitalsWithDistance = HOSPITALS.map(h => ({
    ...h,
    distance: getMockDistance(h.location, location)
  })).sort((a, b) => a.distance - b.distance)

  const handleChat = () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput.toLowerCase()
    setChatMessages(prev => [...prev, { role:'user', text: chatInput }])
    setChatInput('')
    setTimeout(() => {
      let reply = ''
      if (userMsg.includes('chest') || userMsg.includes('heart'))
        reply = '❤️ Your symptoms suggest a Cardiologist. Apollo Hospital (Noida) has 4 available — 18km from you.'
      else if (userMsg.includes('head') || userMsg.includes('migraine') || userMsg.includes('brain'))
        reply = '🧠 Sounds neurological. Fortis Hospital (Gurugram) has 1 Neurologist available.'
      else if (userMsg.includes('bone') || userMsg.includes('fracture') || userMsg.includes('joint'))
        reply = '🦴 You may need an Orthopedic. Apollo Hospital has 3 available.'
      else if (userMsg.includes('fever') || userMsg.includes('cold') || userMsg.includes('cough'))
        reply = '🌡️ General symptoms — visit any Emergency. AIIMS Delhi is available 24/7.'
      else if (userMsg.includes('blood') || userMsg.includes('bleeding'))
        reply = '🩸 Please go to the nearest Emergency immediately. Call 108 for ambulance.'
      else
        reply = 'Could you describe your symptoms in more detail? e.g. chest pain, headache, fever...'
      setChatMessages(prev => [...prev, { role:'bot', text: reply }])
    }, 800)
  }

  const filteredDonors = DONORS.filter(d => {
    const matchBlood = bloodFilter ? d.blood === bloodFilter : true
    const matchCity  = cityFilter  ? d.city.toLowerCase().includes(cityFilter.toLowerCase()) : true
    return matchBlood && matchCity
  })

  const handleAppointmentSubmit = () => {
    if (!appointmentForm.name || !appointmentForm.phone) return
    setAppointmentSent(true)
    setTimeout(() => {
      setAppointmentModal(null)
      setAppointmentSent(false)
      setAppointmentForm({ name:'', phone:'', time:'Morning', symptoms:'' })
    }, 2000)
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)' }}>

      {/* top nav */}
      <div style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border-soft)', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:56 }}>
        <div style={{ fontFamily:'Instrument Serif', fontSize:22 }}>🏥 MediSync</div>
        <div style={{ display:'flex', gap:8 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding:'7px 16px', background: activeTab === tab.id ? 'rgba(91,130,196,0.12)' : 'transparent', border: activeTab === tab.id ? '1px solid rgba(91,130,196,0.3)' : '1px solid transparent', borderRadius:8, cursor:'pointer', color: activeTab === tab.id ? 'var(--cool)' : 'var(--text-muted)', fontSize:13, fontWeight: activeTab === tab.id ? 600 : 400 }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize:12, color:'var(--text-faint)' }}>Public Access · No login required</div>
      </div>

      <div style={{ padding:'32px 36px' }}>

        {/* HOSPITALS TAB */}
        {activeTab === 'hospitals' && (
          <div>
            {!locationSet ? (
              /* location entry screen */
              <div style={{ maxWidth:480, margin:'60px auto', textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📍</div>
                <h2 style={{ fontSize:28, marginBottom:8 }}>Where are you?</h2>
                <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:32 }}>
                  Enter your location to find nearby hospitals and check real-time resource availability
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && location.trim() && setLocationSet(true)}
                    placeholder="e.g. South Delhi, Noida, Gurugram..."
                    style={{ flex:1, padding:'14px 16px', background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:12, color:'var(--text-primary)', fontSize:14, fontFamily:'IBM Plex Sans' }}
                  />
                  <button
                    onClick={() => location.trim() && setLocationSet(true)}
                    style={{ padding:'14px 22px', background:'var(--cool)', border:'none', borderRadius:12, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}
                  >Search →</button>
                </div>

                {/* quick location chips */}
                <div style={{ marginTop:20, display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                  {['New Delhi', 'Noida', 'Gurugram', 'South Delhi', 'East Delhi'].map(loc => (
                    <button key={loc} onClick={() => { setLocation(loc); setLocationSet(true) }} style={{ padding:'6px 14px', background:'rgba(91,130,196,0.08)', border:'1px solid rgba(91,130,196,0.2)', borderRadius:99, color:'var(--cool)', fontSize:12, cursor:'pointer' }}>
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* hospitals list */
              <div>
                {/* location header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                  <div>
                    <h2 style={{ fontSize:26, marginBottom:4 }}>Hospitals near {location}</h2>
                    <p style={{ fontSize:13, color:'var(--text-muted)' }}>Sorted by distance · Live availability</p>
<p style={{ fontSize:12, color:'var(--amber)', marginTop:4 }}>⚠️ Currently covering Delhi NCR hospitals only · More cities coming soon</p>
                  </div>
                  <button onClick={() => { setLocationSet(false); setLocation('') }} style={{ padding:'8px 16px', background:'transparent', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>
                    📍 Change Location
                  </button>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))', gap:20 }}>
                  {hospitalsWithDistance.map((h, idx) => (
                    <div key={h.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderLeft: idx === 0 ? '3px solid var(--cool)' : '1px solid var(--border-soft)', borderRadius:16, padding:24, position:'relative' }}>

                      {/* nearest badge */}
                      {idx === 0 && (
                        <span style={{ position:'absolute', top:16, right:16, fontSize:10, background:'rgba(91,130,196,0.15)', color:'var(--cool)', border:'1px solid rgba(91,130,196,0.3)', padding:'3px 10px', borderRadius:99, textTransform:'uppercase', letterSpacing:0.5 }}>
                          Nearest
                        </span>
                      )}

                      {/* header */}
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:18, fontFamily:'Instrument Serif', marginBottom:4 }}>{h.name}</div>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                          <span style={{ fontSize:12, color:'var(--text-muted)' }}>📍 {h.location}</span>
                          <span style={{ fontSize:12, color:'var(--cool)', fontWeight:600 }}>~{h.distance} km away</span>
                          <span style={{ fontSize:11, padding:'2px 8px', background: h.status === 'critical' ? 'rgba(184,92,92,0.15)' : 'rgba(107,165,131,0.15)', color: h.status === 'critical' ? 'var(--clay)' : 'var(--sage)', border:`1px solid ${h.status === 'critical' ? 'rgba(184,92,92,0.3)' : 'rgba(107,165,131,0.3)'}`, borderRadius:99 }}>
                            {h.status === 'critical' ? '⚠️ Critical' : '✅ Normal'}
                          </span>
                        </div>
                      </div>

                      {/* quick stats */}
                      <div style={{ display:'flex', gap:0, marginBottom:16, background:'var(--bg-raised)', borderRadius:10, overflow:'hidden' }}>
                        {[
                          { label:'ICU',       value:`${h.icuBeds.available}/${h.icuBeds.total}`,         color: h.icuBeds.available <= 5 ? 'var(--clay)' : 'var(--text-primary)' },
                          { label:'Beds',      value:`${h.generalBeds.available}/${h.generalBeds.total}`, color:'var(--text-primary)' },
                          { label:'Ambulance', value:`${h.ambulances.available}/${h.ambulances.total}`,   color:'var(--text-primary)' },
                        ].map((s, i) => (
                          <div key={s.label} style={{ flex:1, textAlign:'center', padding:'10px 4px', borderRight: i < 2 ? '1px solid var(--border-soft)' : 'none' }}>
                            <div style={{ fontSize:15, fontWeight:600, color:s.color }}>{s.value}</div>
                            <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* doctors */}
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:11, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Doctors Available</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {Object.entries(h.doctors).map(([name, data]) => (
                            <div key={name} style={{ padding:'5px 10px', background: data.available === 0 ? 'rgba(184,92,92,0.08)' : 'rgba(255,255,255,0.04)', border:`1px solid ${data.available === 0 ? 'rgba(184,92,92,0.2)' : 'var(--border-soft)'}`, borderRadius:8 }}>
                              <span style={{ fontSize:12 }}>{data.icon} {name}</span>
                              <span style={{ fontSize:12, fontWeight:600, color: data.available === 0 ? 'var(--clay)' : 'var(--sage)', marginLeft:6 }}>{data.available}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setAppointmentModal(h)}
                        style={{ width:'100%', padding:'10px', background:'rgba(91,130,196,0.08)', border:'1px solid rgba(91,130,196,0.25)', borderRadius:10, color:'var(--cool)', cursor:'pointer', fontSize:13, fontWeight:600 }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(91,130,196,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background='rgba(91,130,196,0.08)'}
                      >
                        Request Appointment →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHATBOT TAB */}
        {activeTab === 'chatbot' && (
          <div style={{ maxWidth:640, margin:'0 auto' }}>
            <h2 style={{ fontSize:26, marginBottom:6 }}>AI Symptom Assistant</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>Describe your symptoms — I'll suggest the right specialist</p>
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:20, minHeight:400, marginBottom:16, display:'flex', flexDirection:'column', gap:12 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display:'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth:'80%', padding:'10px 14px', background: msg.role === 'user' ? 'rgba(91,130,196,0.15)' : 'var(--bg-raised)', border:`1px solid ${msg.role === 'user' ? 'rgba(91,130,196,0.25)' : 'var(--border-soft)'}`, borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize:13, color:'var(--text-primary)', lineHeight:1.5 }}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Describe your symptoms..." style={{ flex:1, padding:'12px 16px', background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-primary)', fontSize:14, fontFamily:'IBM Plex Sans' }} />
              <button onClick={handleChat} style={{ padding:'12px 20px', background:'var(--violet)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>Send →</button>
            </div>
          </div>
        )}

        {/* BLOOD FINDER TAB */}
        {activeTab === 'blood' && (
          <div>
            <h2 style={{ fontSize:26, marginBottom:6 }}>Blood Finder</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>Find blood from hospitals or community donors</p>
            <div style={{ display:'flex', gap:12, marginBottom:24 }}>
              <select value={bloodFilter} onChange={e => setBloodFilter(e.target.value)} style={{ padding:'10px 14px', background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-primary)', fontSize:13, fontFamily:'IBM Plex Sans', cursor:'pointer' }}>
                <option value="">All Blood Groups</option>
                {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input value={cityFilter} onChange={e => setCityFilter(e.target.value)} placeholder="Filter by city..." style={{ padding:'10px 14px', background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-primary)', fontSize:13, fontFamily:'IBM Plex Sans', width:200 }} />
            </div>

            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:11, fontWeight:600, marginBottom:14, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>Hospital Stock</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
                {HOSPITALS.map(h => (
                  <div key={h.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20 }}>
                    <div style={{ fontSize:15, fontFamily:'Instrument Serif', marginBottom:14 }}>{h.name}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {Object.entries(h.bloodBank).filter(([type]) => bloodFilter ? type === bloodFilter : true).map(([type, units]) => (
                        <div key={type} style={{ padding:'8px 12px', background: units === 0 ? 'rgba(184,92,92,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${units === 0 ? 'rgba(184,92,92,0.25)' : 'var(--border-soft)'}`, borderRadius:8, textAlign:'center', minWidth:52 }}>
                          <div style={{ fontSize:14, fontWeight:600, color: units === 0 ? 'var(--clay)' : units <= 3 ? 'var(--amber)' : 'var(--sage)' }}>{units}</div>
                          <div style={{ fontSize:11, color:'var(--text-faint)' }}>{type}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize:11, fontWeight:600, marginBottom:14, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>Community Donors</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
                {filteredDonors.map(d => (
                  <div key={d.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:40, height:40, background:'rgba(184,92,92,0.12)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Instrument Serif', fontSize:16, color:'var(--clay)', fontWeight:600, flexShrink:0 }}>{d.blood}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{d.name}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>📍 {d.city} · 📞 {d.phone}</div>
                    </div>
                  </div>
                ))}
                {filteredDonors.length === 0 && (
                  <div style={{ fontSize:13, color:'var(--text-faint)', gridColumn:'span 3', textAlign:'center', padding:20 }}>No donors found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* appointment modal */}
      {appointmentModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg-raised)', border:'1px solid var(--border-medium)', borderRadius:16, padding:'32px 28px', width:380 }}>
            {appointmentSent ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:40, marginBottom:16 }}>✅</div>
                <h3 style={{ fontSize:20, marginBottom:8 }}>Request Sent!</h3>
                <p style={{ fontSize:13, color:'var(--text-muted)' }}>The hospital will confirm your appointment shortly.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize:20, marginBottom:4 }}>Request Appointment</h3>
                <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>{appointmentModal.name}</p>
                {[
                  { label:'Your Name', key:'name', type:'text', placeholder:'Full name' },
                  { label:'Phone Number', key:'phone', type:'tel', placeholder:'10-digit number' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--text-faint)', marginBottom:6 }}>{field.label}</label>
                    <input type={field.type} placeholder={field.placeholder} value={appointmentForm[field.key]} onChange={e => setAppointmentForm(prev => ({ ...prev, [field.key]: e.target.value }))} style={{ width:'100%', padding:'11px 14px', background:'var(--bg-base)', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-primary)', fontSize:14, fontFamily:'IBM Plex Sans' }} />
                  </div>
                ))}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--text-faint)', marginBottom:6 }}>Preferred Time</label>
                  <select value={appointmentForm.time} onChange={e => setAppointmentForm(prev => ({ ...prev, time: e.target.value }))} style={{ width:'100%', padding:'11px 14px', background:'var(--bg-base)', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-primary)', fontSize:14, fontFamily:'IBM Plex Sans', cursor:'pointer' }}>
                    {['Morning','Afternoon','Evening'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={{ display:'block', fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--text-faint)', marginBottom:6 }}>Symptoms (optional)</label>
                  <textarea value={appointmentForm.symptoms} onChange={e => setAppointmentForm(prev => ({ ...prev, symptoms: e.target.value }))} placeholder="Briefly describe your symptoms..." maxLength={200} rows={3} style={{ width:'100%', padding:'11px 14px', background:'var(--bg-base)', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-primary)', fontSize:13, fontFamily:'IBM Plex Sans', resize:'none' }} />
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setAppointmentModal(null)} style={{ flex:1, padding:12, background:'transparent', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-muted)', cursor:'pointer' }}>Cancel</button>
                  <button onClick={handleAppointmentSubmit} style={{ flex:1, padding:12, background:'var(--cool)', border:'none', borderRadius:10, color:'#fff', fontWeight:600, cursor:'pointer' }}>Send Request →</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}