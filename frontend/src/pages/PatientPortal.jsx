import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { DONORS } from '../data/mockData'

export default function PatientPortal() {
  const [hospitals, setHospitals] = useState([])
  const [activeTab, setActiveTab] = useState('hospitals')
  const [location, setLocation] = useState('')
  const [locationSet, setLocationSet] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: "Hi! I'm MediSync AI 👋 Describe your symptoms and I'll suggest which specialist and hospital to visit." }
  ])
  const [chatInput, setChatInput] = useState('')
  const [bloodFilter, setBloodFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [appointmentModal, setAppointmentModal] = useState(null)
  // Replace your existing appointmentForm with this:
  const [appointmentForm, setAppointmentForm] = useState({ 
    name: '', 
    phone: '', 
    aadhaar: '',      // NEW
    time: 'Morning', 
    symptoms: '', 
    selectedDoctor: '' // NEW
  });
  const [appointmentSent, setAppointmentSent] = useState(false)

  // real-time listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hospitals'), snapshot => {
      const data = snapshot.docs
        .map(d => ({ ...d.data(), firestoreId: d.id }))
        .sort((a, b) => a.id - b.id)
      setHospitals(data)
    })
    return () => unsub()
  }, [])

  const tabs = [
    { id: 'hospitals', label: 'Hospitals', icon: '🏥' },
    { id: 'chatbot', label: 'AI Assistant', icon: '🤖' },
    { id: 'blood', label: 'Blood Finder', icon: '🩸' },
  ]

  const getMockDistance = (hospitalLocation, userLocation) => {
    const loc = userLocation.toLowerCase()
    const hLoc = hospitalLocation.toLowerCase()
    if (hLoc.includes(loc) || loc.includes(hLoc)) return 2
    const distanceMap = {
      'new delhi': { 'gurugram': 32, 'noida': 18 },
      'gurugram': { 'new delhi': 32, 'noida': 48 },
      'noida': { 'new delhi': 18, 'gurugram': 48 },
      'delhi': { 'gurugram': 32, 'noida': 18 },
      'south delhi': { 'gurugram': 18, 'noida': 28 },
      'east delhi': { 'noida': 12, 'gurugram': 40 },
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

  const hospitalsWithDistance = hospitals.map(h => ({
    ...h,
    distance: getMockDistance(h.location, location)
  })).sort((a, b) => a.distance - b.distance)

  const handleChat = () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput.toLowerCase()
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }])
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
      setChatMessages(prev => [...prev, { role: 'bot', text: reply }])
    }, 800)
  }

  const filteredDonors = DONORS.filter(d => {
    const matchBlood = bloodFilter ? d.blood === bloodFilter : true
    const matchCity = cityFilter ? d.city.toLowerCase().includes(cityFilter.toLowerCase()) : true
    return matchBlood && matchCity
  })
const handleAppointmentSubmit = async () => {
    // 1. Validation
    if (!appointmentForm.name || !appointmentForm.phone || !appointmentForm.aadhaar) {
      alert("Please fill in Name, Phone, and Aadhaar");
      return;
    }

    try {
      // 2. Calculate the fee to charge (Default to 500 if no doctor or fee is found)
      const selectedDocData = appointmentForm.selectedDoctor ? appointmentModal.doctors[appointmentForm.selectedDoctor] : null;
      const feeToCharge = selectedDocData && selectedDocData.fee ? selectedDocData.fee : 500;

      // 3. Push to Firestore
      await addDoc(collection(db, "appointments"), {
        hospitalId: appointmentModal.firestoreId || appointmentModal.id || "unknown",
        hospitalName: appointmentModal.name,
        patientName: appointmentForm.name,
        phone: appointmentForm.phone,
        aadhaar: appointmentForm.aadhaar,
        doctorName: appointmentForm.selectedDoctor || "General Physician",
        timePreference: appointmentForm.time || "Morning (9 AM - 12 PM)",
        symptoms: appointmentForm.symptoms || "No symptoms provided",
        fee: feeToCharge, // 💰 SAVES THE FEE TO THE DATABASE
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      // 4. Success UI & Reset
      setAppointmentSent(true);
      setTimeout(() => {
        setAppointmentModal(null);
        setAppointmentSent(false);
        setAppointmentForm({ name: '', phone: '', aadhaar: '', time: 'Morning (9 AM - 12 PM)', symptoms: '', selectedDoctor: '' });
      }, 2000);
    } catch (error) {
      console.error("Firebase Error:", error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* top nav */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ fontFamily: 'Instrument Serif', fontSize: 22 }}>🏥 MediSync</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '7px 16px', background: activeTab === tab.id ? 'rgba(91,130,196,0.12)' : 'transparent', border: activeTab === tab.id ? '1px solid rgba(91,130,196,0.3)' : '1px solid transparent', borderRadius: 8, cursor: 'pointer', color: activeTab === tab.id ? 'var(--cool)' : 'var(--text-muted)', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400 }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Public Access · No login required</div>
      </div>

      <div style={{ padding: '32px 36px' }}>
        {/* HOSPITALS TAB */}
        {activeTab === 'hospitals' && (
          <div>
            {!locationSet ? (
              <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
                <h2 style={{ fontSize: 28, marginBottom: 8 }}>Where are you?</h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
                  Enter your location to find nearby hospitals and check real-time resource availability
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && location.trim() && setLocationSet(true)}
                    placeholder="e.g. South Delhi, Noida, Gurugram..."
                    style={{ flex: 1, padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'IBM Plex Sans' }}
                  />
                  <button
                    onClick={() => location.trim() && setLocationSet(true)}
                    style={{ padding: '14px 22px', background: 'var(--cool)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >Search →</button>
                </div>
                <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['New Delhi', 'Noida', 'Gurugram', 'South Delhi', 'East Delhi'].map(loc => (
                    <button key={loc} onClick={() => { setLocation(loc); setLocationSet(true) }} style={{ padding: '6px 14px', background: 'rgba(91,130,196,0.08)', border: '1px solid rgba(91,130,196,0.2)', borderRadius: 99, color: 'var(--cool)', fontSize: 12, cursor: 'pointer' }}>
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 26, marginBottom: 4 }}>Hospitals near {location}</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sorted by distance · Live availability</p>
                    <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>⚠️ Currently covering Delhi NCR hospitals only</p>
                  </div>
                  <button onClick={() => { setLocationSet(false); setLocation('') }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                    📍 Change Location
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
                  {hospitalsWithDistance.map((h, idx) => (
                    <div key={h.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderLeft: idx === 0 ? '3px solid var(--cool)' : '1px solid var(--border-soft)', borderRadius: 16, padding: 24, position: 'relative' }}>
                      {idx === 0 && (
                        <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, background: 'rgba(91,130,196,0.15)', color: 'var(--cool)', border: '1px solid rgba(91,130,196,0.3)', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Nearest
                        </span>
                      )}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 18, fontFamily: 'Instrument Serif', marginBottom: 4 }}>{h.name}</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {h.location}</span>
                          <span style={{ fontSize: 12, color: 'var(--cool)', fontWeight: 600 }}>~{h.distance} km away</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg-raised)', borderRadius: 10, overflow: 'hidden' }}>
                        {[
                          { label: 'ICU', value: `${h.icuBeds.available}/${h.icuBeds.total}`, color: h.icuBeds.available <= 5 ? 'var(--clay)' : 'var(--text-primary)' },
                          { label: 'Beds', value: `${h.generalBeds.available}/${h.generalBeds.total}`, color: 'var(--text-primary)' },
                          { label: 'Ambulance', value: `${h.ambulances.available}/${h.ambulances.total}`, color: 'var(--text-primary)' },
                        ].map((s, i) => (
                          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRight: i < 2 ? '1px solid var(--border-soft)' : 'none' }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setAppointmentModal(h)}
                        style={{ width: '100%', padding: '10px', background: 'rgba(91,130,196,0.08)', border: '1px solid rgba(91,130,196,0.25)', borderRadius: 10, color: 'var(--cool)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >Request Appointment →</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHATBOT TAB */}
        {activeTab === 'chatbot' && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontSize: 26, marginBottom: 6 }}>AI Symptom Assistant</h2>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 16, padding: 20, minHeight: 400, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', padding: '10px 14px', background: msg.role === 'user' ? 'rgba(91,130,196,0.15)' : 'var(--bg-raised)', borderRadius: '12px', fontSize: 13 }}>{msg.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Describe your symptoms..." style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 10, color: 'white' }} />
              <button onClick={handleChat} style={{ padding: '12px 20px', background: 'var(--violet)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>Send →</button>
            </div>
          </div>
        )}

        {/* BLOOD FINDER TAB */}
        {activeTab === 'blood' && (
          <div>
            <h2 style={{ fontSize: 26, marginBottom: 6 }}>Blood Finder</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {hospitals.map(h => (
                <div key={h.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 15, fontFamily: 'Instrument Serif', marginBottom: 14 }}>{h.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(h.bloodBank).map(([type, units]) => (
                      <div key={type} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{units}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* appointment modal */}
     {appointmentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-raised)', borderRadius: 16, padding: '32px 28px', width: 380 }}>
            {appointmentSent ? (
              <div style={{ textAlign: 'center' }}><h3>✅ Sent!</h3></div>
            ) : (
              <>
               <h3 style={{ marginBottom: 20 }}>Request Appointment</h3>
                
                {/* 1. Doctor Dropdown */}
                <select 
                  value={appointmentForm.selectedDoctor || ''} 
                  onChange={e => setAppointmentForm(p => ({ ...p, selectedDoctor: e.target.value }))}
                  style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)' }}
                >
                  <option value="">Any Available Doctor</option>
                  {appointmentModal.doctors && Object.keys(appointmentModal.doctors).map(docName => (
                    <option key={docName} value={docName}>{docName}</option>
                  ))}
                </select>

                {/* 2. Live Price Box */}
                <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(107, 165, 131, 0.1)', borderRadius: 8, border: '1px solid rgba(107, 165, 131, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {appointmentForm.selectedDoctor ? 'Specialist Fee:' : 'General Fee:'}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage)' }}>
                    ₹{appointmentForm.selectedDoctor && appointmentModal.doctors[appointmentForm.selectedDoctor] 
                        ? (appointmentModal.doctors[appointmentForm.selectedDoctor].fee || 500) 
                        : 500}
                  </span>
                </div>

                {/* 3. Patient Details */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input placeholder="Full Name" value={appointmentForm.name} onChange={e => setAppointmentForm(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)' }} />
                  <input placeholder="Mobile" value={appointmentForm.phone} onChange={e => setAppointmentForm(p => ({ ...p, phone: e.target.value }))} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)' }} />
                </div>

                <input placeholder="Aadhaar Number (12 digits)" value={appointmentForm.aadhaar || ''} onChange={e => setAppointmentForm(p => ({ ...p, aadhaar: e.target.value }))} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)' }} />

                {/* 4. Time Preference */}
                <select value={appointmentForm.time || 'Morning (9 AM - 12 PM)'} onChange={e => setAppointmentForm(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)' }}>
                  <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                  <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                </select>

                {/* 5. Symptoms Box */}
                <textarea 
                  placeholder="Briefly describe your symptoms..." 
                  value={appointmentForm.symptoms || ''} 
                  onChange={e => setAppointmentForm(p => ({ ...p, symptoms: e.target.value }))} 
                  rows={2} 
                  style={{ width: '100%', padding: 10, marginBottom: 20, borderRadius: 8, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)', resize: 'none', fontFamily: 'inherit' }} 
                />

                {/* 6. Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setAppointmentModal(null)} style={{ flex: 1, padding: 10, cursor: 'pointer', background: 'transparent', color: 'white', border: '1px solid var(--border-soft)', borderRadius: 8 }}>Cancel</button>
                  <button onClick={handleAppointmentSubmit} style={{ flex: 1, padding: 10, background: 'var(--cool)', color: 'white', cursor: 'pointer', border: 'none', borderRadius: 8, fontWeight: 600 }}>Confirm & Book</button>
                </div>
              </>
            )}
          </div>
        </div>
      )} 
    </div>
  )
}