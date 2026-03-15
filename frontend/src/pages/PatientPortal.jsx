import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { DONORS } from '../data/mockData'
import { db, auth } from '../firebase'
import { useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";
export default function PatientPortal() {
  const navigate = useNavigate();

  // 1. AUTH PROTECTION
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        console.log("No user found! Redirecting to login...");
        navigate('/patient-dashboard'); 
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. STATE MANAGEMENT
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
  const [appointmentForm, setAppointmentForm] = useState({ 
    name: '', 
    phone: '', 
    aadhaar: '',      
    time: 'Morning (9 AM - 12 PM)', 
    symptoms: '', 
    selectedDoctor: '' 
  });
  const [appointmentSent, setAppointmentSent] = useState(false)

  // 3. REAL-TIME HOSPITAL DATA
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

  // 4. DISTANCE LOGIC
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

  // 5. STABLE GEMINI AI CHAT LOGIC
const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'bot', text: 'Thinking...' }]);

    try {
      const apiKey = "AIzaSyDFcUL2_bX0VSXbjs9KvLZn0b9sH19mmzs"; 
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // YOU WERE RIGHT: gemini-2.5-flash is the active model

      // const model = genAI.getGenerativeModel({ 
      //   model: "gemini-2.5-flash",
      //   // This stops the "dumb" answers by forcing it into a strict persona
      //   systemInstruction: "You are MediSync AI, an expert medical assistant. Analyze the user's symptoms and recommend a specific doctor specialty (like Cardiologist, Orthopedist). Provide exactly 1 short sentence of professional advice."
      // });
      // 🟢 Upgraded brain: Now handles triage AND safe home remedies!
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: `You are MediSync AI, a helpful medical triage assistant. Analyze the user's symptoms and do the following in 2 to 3 short sentences:
        1. Recommend a specific doctor specialty (like Dermatologist, Orthopedist).
        2. Suggest one simple, safe home remedy or comfort measure for temporary relief. 
        3. CRITICAL: If the symptoms sound like a severe emergency (e.g., chest pain, severe bleeding, stroke), skip the home remedy and strictly advise immediate emergency care.`
      });
      // Now we just pass the user's message directly
      const result = await model.generateContent(userMsg);
      const response = await result.response;
      const aiText = response.text();

      setChatMessages(prev => {
        const updatedChat = [...prev];
        updatedChat[updatedChat.length - 1] = { role: 'bot', text: aiText };
        return updatedChat;
      });

    } catch (error) {
      console.error("Gemini Error:", error);
      setChatMessages(prev => {
        const updatedChat = [...prev];
        updatedChat[updatedChat.length - 1] = { 
          role: 'bot', 
          text: `Connection Error: ${error.message}` 
        };
        return updatedChat;
      });
    }
  };

  // 6. APPOINTMENT SUBMISSION
  const handleAppointmentSubmit = async () => {
    const phoneRegex = /^[0-9]{10}$/;
    const aadhaarRegex = /^[0-9]{12}$/;

    if (!appointmentForm.name || !appointmentForm.phone || !appointmentForm.aadhaar) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }
    if (!phoneRegex.test(appointmentForm.phone)) {
      alert("⚠️ Invalid Phone! 10 digits required.");
      return;
    }
    if (!aadhaarRegex.test(appointmentForm.aadhaar)) {
      alert("⚠️ Invalid Aadhaar! 12 digits required.");
      return;
    }

    try {
      const selectedDocData = appointmentForm.selectedDoctor ? appointmentModal.doctors[appointmentForm.selectedDoctor] : null;
      const feeToCharge = selectedDocData && selectedDocData.fee ? selectedDocData.fee : 500;

      await addDoc(collection(db, "appointments"), {
        hospitalId: appointmentModal.firestoreId || appointmentModal.id,
        hospitalName: appointmentModal.name,
        patientName: appointmentForm.name,
        phone: appointmentForm.phone,
        aadhaar: appointmentForm.aadhaar,
        doctorName: appointmentForm.selectedDoctor || "General Physician",
        timePreference: appointmentForm.time,
        symptoms: appointmentForm.symptoms || "No symptoms provided",
        fee: feeToCharge,
        status: "pending",
        patientUid: auth.currentUser ? auth.currentUser.uid : "guest",
        tokenNumber: `TKN-${Math.floor(Math.random() * 900) + 100}`,
        createdAt: serverTimestamp()
      });
      
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'white', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      
      {/* --- TOP NAVIGATION --- */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <div style={{ fontFamily: 'Instrument Serif', fontSize: 26, color: 'var(--cool)', cursor: 'pointer' }} onClick={() => navigate('/')}>MediSync</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '8px 18px', background: activeTab === tab.id ? 'rgba(91,130,196,0.1)' : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', color: activeTab === tab.id ? 'var(--cool)' : 'var(--text-muted)', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400, transition: '0.2s' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: 'var(--sage)', borderRadius: '50%' }}></span> Logged In
          </div>
          <button onClick={() => navigate('/patient-dashboard')} style={{ padding: '10px 20px', background: 'var(--cool)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 12px rgba(91,130,196,0.2)' }}>
            🎫 View My Tokens
          </button>
        </div>
      </div>
      
      {/* --- MAIN CONTENT --- */}
      <div style={{ padding: '40px 60px' }}>

{/* 🏥 HOSPITALS TAB */}
{activeTab === 'hospitals' && (
  <div>
    {/* STEP 1: If location is NOT set, show the Search Screen */}
    {!locationSet ? (
      <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', background: 'var(--bg-surface)', padding: '40px', borderRadius: 24, border: '1px solid var(--border-soft)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>📍</div>
        <h2 style={{ fontSize: 32, marginBottom: 12, fontFamily: 'Instrument Serif' }}>Where are you?</h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
          Enter your city or area to find the nearest hospitals with live bed and ICU availability.
        </p>
        
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input 
            value={location} 
            onChange={e => setLocation(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && location.trim() && setLocationSet(true)}
            placeholder="e.g. Noida, South Delhi, Gurugram..." 
            style={{ flex: 1, padding: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-soft)', borderRadius: 12, color: 'white', fontSize: 15, outline: 'none' }} 
          />
          <button 
            onClick={() => location.trim() && setLocationSet(true)} 
            style={{ padding: '0 28px', background: 'var(--cool)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            Find Hospitals
          </button>
        </div>

        {/* Quick Select Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Noida', 'Gurugram', 'South Delhi'].map(city => (
            <button 
              key={city}
              onClick={() => { setLocation(city); setLocationSet(true); }}
              style={{ padding: '6px 14px', background: 'rgba(91,130,196,0.1)', border: '1px solid rgba(91,130,196,0.2)', borderRadius: 99, color: 'var(--cool)', fontSize: 12, cursor: 'pointer' }}
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    ) : (
      /* STEP 2: If location IS set, show the Hospital Recommendations */
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h2 style={{ fontSize: 32, marginBottom: 8, fontFamily: 'Instrument Serif' }}>Hospitals near {location}</h2>
            <p style={{ fontSize: 14, color: 'var(--sage)' }}>● Showing real-time resource availability</p>
          </div>
          <button 
            onClick={() => { setLocationSet(false); setLocation(''); }} 
            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: 12, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
          >
            📍 Change Location
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
          {hospitalsWithDistance.map((h, idx) => (
            <div key={h.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderTop: idx === 0 ? '4px solid var(--cool)' : '1px solid var(--border-soft)', borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 22, fontFamily: 'Instrument Serif', marginBottom: 4 }}>{h.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📍 {h.location} · <span style={{ color: 'var(--cool)', fontWeight: 600 }}>{h.distance} km</span></div>
                </div>
                {idx === 0 && <span style={{ background: 'rgba(91,130,196,0.1)', color: 'var(--cool)', padding: '4px 12px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>RECOMMENDED</span>}
              </div>

              {/* Resource Mini-Dashboard */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1, padding: '10px', background: 'var(--bg-base)', borderRadius: 12, textAlign: 'center', border: '1px solid var(--border-soft)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{h.icuBeds?.available || 0}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase' }}>ICU Beds</div>
                </div>
                <div style={{ flex: 1, padding: '10px', background: 'var(--bg-base)', borderRadius: 12, textAlign: 'center', border: '1px solid var(--border-soft)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{h.generalBeds?.available || 0}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase' }}>General</div>
                </div>
              </div>

              <button 
                onClick={() => setAppointmentModal(h)} 
                style={{ width: '100%', padding: '14px', background: 'rgba(91,130,196,0.08)', border: '1px solid rgba(91,130,196,0.3)', borderRadius: 12, color: 'var(--cool)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Book Appointment →
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

        {/* 🤖 AI ASSISTANT TAB */}
        {activeTab === 'chatbot' && (
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 32, fontFamily: 'Instrument Serif', marginBottom: 8 }}>AI Symptom Assistant</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Describe how you feel, and our AI will direct you to the right specialist.</p>
            </div>
            
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 24, padding: 30, height: 450, overflowY: 'auto', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', padding: '14px 20px', background: msg.role === 'user' ? 'var(--cool)' : 'var(--bg-base)', borderRadius: 18, borderBottomRightRadius: msg.role === 'user' ? 4 : 18, borderBottomLeftRadius: msg.role === 'bot' ? 4 : 18, fontSize: 14, lineHeight: 1.5, border: msg.role === 'bot' ? '1px solid var(--border-soft)' : 'none' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: 12, background: 'var(--bg-surface)', padding: 12, borderRadius: 18, border: '1px solid var(--border-soft)' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="e.g. I have a sharp pain in my lower back..." style={{ flex: 1, padding: '14px', background: 'transparent', border: 'none', color: 'white', fontSize: 15, outline: 'none' }} />
              <button onClick={handleChat} style={{ padding: '0 24px', background: 'var(--cool)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Send →</button>
            </div>
          </div>
        )}

        {/* 🩸 BLOOD FINDER TAB */}
        {activeTab === 'blood' && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 32, fontFamily: 'Instrument Serif', marginBottom: 8 }}>Blood Availability</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Real-time stock of blood units across our hospital network.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {hospitals.map(h => (
                <div key={h.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 24 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border-soft)', paddingBottom: 12 }}>{h.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    {Object.entries(h.bloodBank || {}).map(([type, units]) => (
                      <div key={type} style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--bg-base)', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: units > 0 ? 'var(--clay)' : 'var(--text-faint)' }}>{units}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>{type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- APPOINTMENT MODAL --- */}
      {appointmentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 24, padding: 40, width: '100%', maxWidth: 450, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid var(--border-soft)' }}>
            {appointmentSent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
                <h3 style={{ fontSize: 24, marginBottom: 8 }}>Booking Confirmed!</h3>
                <p style={{ color: 'var(--text-muted)' }}>Redirecting to your dashboard...</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 24, marginBottom: 24, fontFamily: 'Instrument Serif' }}>Book Appointment</h3>
                
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Select Specialist</label>
                <select value={appointmentForm.selectedDoctor} onChange={e => setAppointmentForm(p => ({ ...p, selectedDoctor: e.target.value }))} style={{ width: '100%', padding: '14px', marginBottom: 12, borderRadius: 12, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)', fontSize: 14 }}>
                  <option value="">Any Available Doctor</option>
                  {appointmentModal.doctors && Object.keys(appointmentModal.doctors).map(docName => (
                    <option key={docName} value={docName}>{docName}</option>
                  ))}
                </select>

                <div style={{ marginBottom: 24, padding: '12px 16px', background: 'rgba(107, 165, 131, 0.05)', borderRadius: 12, border: '1px solid rgba(107, 165, 131, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Consultation Fee:</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--sage)' }}>₹{appointmentForm.selectedDoctor && appointmentModal.doctors[appointmentForm.selectedDoctor] ? (appointmentModal.doctors[appointmentForm.selectedDoctor].fee || 500) : 500}</span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <input placeholder="Full Name" value={appointmentForm.name} onChange={e => setAppointmentForm(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)', fontSize: 14 }} />
                  <input type="number" placeholder="Phone (10 digits)" value={appointmentForm.phone} onChange={e => setAppointmentForm(p => ({ ...p, phone: e.target.value.slice(0, 10) }))} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)', fontSize: 14 }} />
                </div>

                <input type="number" placeholder="Aadhaar Number (12 digits)" value={appointmentForm.aadhaar} onChange={e => setAppointmentForm(p => ({ ...p, aadhaar: e.target.value.slice(0, 12) }))} style={{ width: '100%', padding: 14, marginBottom: 12, borderRadius: 12, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)', fontSize: 14 }} />

                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Time Slot</label>
                <select value={appointmentForm.time} onChange={e => setAppointmentForm(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: 14, marginBottom: 12, borderRadius: 12, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)', fontSize: 14 }}>
                  <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                  <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                </select>

                <textarea placeholder="Describe symptoms (optional)" value={appointmentForm.symptoms} onChange={e => setAppointmentForm(p => ({ ...p, symptoms: e.target.value }))} rows={2} style={{ width: '100%', padding: 14, marginBottom: 24, borderRadius: 12, background: 'var(--bg-base)', color: 'white', border: '1px solid var(--border-soft)', resize: 'none', fontSize: 14 }} />

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setAppointmentModal(null)} style={{ flex: 1, padding: 14, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-soft)', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={handleAppointmentSubmit} style={{ flex: 1, padding: 14, background: 'var(--cool)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>Confirm & Book</button>
                </div>
              </>
            )}
          </div>
        </div>
      )} 
    </div>
  )
}