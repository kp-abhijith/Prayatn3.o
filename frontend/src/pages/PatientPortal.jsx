import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase'
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { signOut } from "firebase/auth";

export default function PatientPortal() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const chatEndRef = useRef(null);
  
  const [role, setRole] = useState(null); 
  const [patientCity, setPatientCity] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setRole('patient'); 
      } else {
        navigate('/'); 
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    setRole(null);
    setIsLoggedIn(false);
    setLocationSet(false);
    setPatientCity('');
    navigate('/');
  };

  const [hospitals, setHospitals] = useState([])
  const [activeTab, setActiveTab] = useState('hospitals')
  const [location, setLocation] = useState('Indore') 
  const [locationSet, setLocationSet] = useState(false) 
  const [selectedHospital, setSelectedHospital] = useState(null)

  useEffect(() => {
    if (auth.currentUser && routerLocation.state?.location) {
      setLocation(routerLocation.state.location);
      setLocationSet(true);
      setIsLoggedIn(true);
    }
  }, [routerLocation.state]);

  useEffect(() => {
    if (routerLocation.state?.tab) {
      setActiveTab(routerLocation.state.tab);
    }
  }, [routerLocation.state?.tab]);
  
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: "Hi! I'm MediSync AI. Describe your symptoms and I'll suggest which specialist and hospital to visit." }
  ])
  const [chatInput, setChatInput] = useState('')
  const [appointmentModal, setAppointmentModal] = useState(null)
  const [appointmentForm, setAppointmentForm] = useState({ 
    name: '', phone: '', aadhaar: '', time: 'Morning (9 AM - 12 PM)', symptoms: '', selectedDoctor: '' 
  });
  const [appointmentSent, setAppointmentSent] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hospitals'), snapshot => {
      const data = snapshot.docs
        .map(d => ({ ...d.data(), firestoreId: d.id }))
        .sort((a, b) => a.id - b.id)
      setHospitals(data)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (selectedHospital) {
      const freshData = hospitals.find(h => h.firestoreId === selectedHospital.firestoreId);
      if (freshData) {
        setSelectedHospital(freshData);
      }
    }
  }, [hospitals, selectedHospital]);

  const tabs = [
    { id: 'hospitals', label: 'Hospitals' },
    { id: 'chatbot', label: 'AI Assistant' },
    { id: 'blood', label: 'Blood Finder' },
  ]

  const getMockDistance = (hospitalLocation, userLocation) => {
    if (!hospitalLocation) return 5;
    const loc = userLocation.toLowerCase()
    const hLoc = hospitalLocation.toLowerCase()
    if (hLoc.includes(loc) || loc.includes(hLoc)) return 1.5
    return Math.floor(Math.random() * 8) + 2 
  }

  const hospitalsWithDistance = hospitals.map(h => ({
    ...h,
    distance: getMockDistance(h.location, location)
  })).sort((a, b) => a.distance - b.distance)

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'bot', text: 'Analyzing symptoms and finding the best equipped hospital near you...' }]);

    try {
      const apiKey = "AIzaSyDFcUL2_bX0VSXbjs9KvLZn0b9sH19mmzs"; 
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const liveHospitalContext = hospitalsWithDistance.map(h => {
        const icuBeds = h.icuBeds?.available || 0;
        const availableDocs = h.doctors ? Object.keys(h.doctors).join(', ') : 'General Physicians';
        return `[Hospital: ${h.name} | Distance: ${h.distance} km | ICU Beds Available: ${icuBeds} | Specialists: ${availableDocs}]`;
      }).join('\n');

      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: `You are MediSync AI, an intelligent emergency routing assistant. 
        The user is in ${location || 'Indore'}.
        Here is the REAL-TIME data of nearby hospitals:
        ${liveHospitalContext}
        Analyze the patient's symptoms and reply in 3 short, professional sentences:
        1. Identify the probable issue and the specialist needed.
        2. Recommend the BEST hospital from the provided data.
        3. Give a safe immediate first-aid tip or strictly tell them to call an ambulance if critical.`
      });

      const result = await model.generateContent(userMsg);
      const aiText = await result.response.text();

      setChatMessages(prev => {
        const updatedChat = [...prev];
        updatedChat[updatedChat.length - 1] = { role: 'bot', text: aiText };
        return updatedChat;
      });
    } catch (error) {
      setChatMessages(prev => {
        const updatedChat = [...prev];
        updatedChat[updatedChat.length - 1] = { role: 'bot', text: `Connection Error: ${error.message}` };
        return updatedChat;
      });
    }
  };

  const handleAppointmentSubmit = async () => {
    const phoneRegex = /^[0-9]{10}$/;
    const aadhaarRegex = /^[0-9]{12}$/;

    if (!appointmentForm.name || !appointmentForm.phone || !appointmentForm.aadhaar) return alert("Please fill in all required fields.");
    if (!phoneRegex.test(appointmentForm.phone)) return alert("Invalid Phone! 10 digits required.");
    if (!aadhaarRegex.test(appointmentForm.aadhaar)) return alert("Invalid Aadhaar! 12 digits required.");

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
    } catch (error) { console.error("Firebase Error:", error); }
  };

  if (role === null) return null; 

  if (role === 'patient' && !isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f5f3', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#ffffff', padding: '50px 40px', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.06)', border: '1px solid #d1e5dd', textAlign: 'center', width: '90%', maxWidth: '420px' }}>
          {auth.currentUser && <p style={{fontWeight: '700', color: '#0d5f0d', marginBottom: 12, fontSize: 15, letterSpacing: '0.5px'}}>Welcome, {auth.currentUser.displayName || auth.currentUser.email}</p>}
          <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 42, marginBottom: 10, color: '#0f172a', fontWeight: 'bold' }}>Your Location</h2>
          <p style={{ color: '#475569', marginBottom: 32, fontSize: 15, fontWeight: '500' }}>Enter your city to find nearby hospitals</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input 
              type="text" placeholder="e.g., Indore, Bhopal" value={patientCity} onChange={(e) => setPatientCity(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter' && patientCity.trim() !== '') { setLocation(patientCity); setLocationSet(true); setIsLoggedIn(true); } }}
              style={{ padding: '18px', borderRadius: 16, background: '#f0f5f3', color: '#0f172a', border: '1px solid #d1e5dd', fontSize: 16, outline: 'none', fontWeight: '600' }}
            />
            <button 
              onClick={() => { if (patientCity.trim() !== '') { setLocation(patientCity); setLocationSet(true); setIsLoggedIn(true); } else { alert("Please enter a city!"); } }}
              style={{ padding: '18px', background: '#0d5f0d', color: '#ffffff', borderRadius: 16, border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: 16, boxShadow: '0 8px 20px rgba(13, 95, 13, 0.2)', letterSpacing: '0.5px' }}>
              Find Hospitals →
            </button>
            <button onClick={handleLogout} style={{ marginTop: 12, padding: '10px', background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: '600' }}>
              ← Cancel & Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      '--bg-base': '#f0f5f3', '--bg-surface': '#ffffff', '--border-soft': '#d1e5dd', '--cool': '#0d5f0d', '--sage': '#16a34a', '--warm': '#dc2626', '--text-main': '#0f172a', '--text-muted': '#475569', '--text-faint': '#64748b',
      minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' 
    }}>
      
      {/* nav */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <div style={{ fontFamily: 'Instrument Serif', fontSize: 28, color: 'var(--cool)', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleLogout}>MediSync</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '8px 18px', background: activeTab === tab.id ? 'rgba(13, 95, 13, 0.1)' : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', color: activeTab === tab.id ? 'var(--cool)' : 'var(--text-muted)', fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500, transition: '0.2s' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: 'var(--sage)', borderRadius: '50%' }}></span> {auth.currentUser?.email || 'Logged In'}
          </div>
        </div>
      </div>
      
      {/* main area */}
      <div style={{ padding: '32px 60px' }}>

        {/* 🟢 NEW FEATURE: PREMIUM TOKEN TRACKER CARD */}
        {locationSet && (
          <div 
            onClick={() => navigate('/patient-dashboard')}
            style={{ background: 'linear-gradient(135deg, #0d5f0d 0%, #16a34a 100%)', padding: '20px 28px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(13, 95, 13, 0.25)', color: 'white', transition: '0.3s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '14px', fontSize: '24px', backdropFilter: 'blur(4px)' }}>🎟️</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>Track Your Live Tokens</h3>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, marginTop: '4px', fontWeight: '500' }}>View your active queue status and estimated wait times.</p>
              </div>
            </div>
            <div style={{ fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '10px 20px', borderRadius: '99px' }}>
              View Dashboard <span>→</span>
            </div>
          </div>
        )}

        {/* hospitals */}
        {activeTab === 'hospitals' && (
          <div>
         {!locationSet ? (
              <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', background: 'var(--bg-surface)', padding: '40px', borderRadius: 24, border: '1px solid var(--border-soft)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: 32, marginBottom: 12, fontFamily: 'Instrument Serif', color: 'var(--text-main)', fontWeight: 'bold' }}>Where are you?</h2>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, marginTop: 20 }}>
                  <input 
                    value={location} 
                    onChange={e => setLocation(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && location.trim() && setLocationSet(true)}
                    placeholder="e.g. Vijay Nagar, Palasia..." 
                    style={{ flex: 1, padding: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-soft)', borderRadius: 12, color: 'var(--text-main)', fontSize: 15, outline: 'none', fontWeight: '500' }} 
                  />
                  <button 
                    onClick={() => location.trim() && setLocationSet(true)} 
                    style={{ padding: '0 28px', background: 'var(--cool)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Find
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['Vijay Nagar', 'Bhanwarkuan', 'Palasia'].map(city => (
                    <button 
                      key={city}
                      onClick={() => { setLocation(city); setLocationSet(true); }}
                      style={{ padding: '6px 14px', background: 'rgba(13, 95, 13, 0.05)', border: '1px solid rgba(13, 95, 13, 0.2)', borderRadius: 99, color: 'var(--cool)', fontSize: 13, fontWeight: '600', cursor: 'pointer' }}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
                  <div>
                    <h2 style={{ fontSize: 32, marginBottom: 8, fontFamily: 'Instrument Serif', color: 'var(--text-main)', fontWeight: 'bold' }}>Hospitals near {location}</h2>
                    <p style={{ fontSize: 14, color: 'var(--sage)', fontWeight: '600' }}>Showing real-time resource availability</p>
                  </div>
                  <button onClick={() => { setLocationSet(false); setLocation(''); setIsLoggedIn(false); setPatientCity(''); }} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: 12, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: '600' }}>Change Location</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
                  {hospitalsWithDistance.map((h, idx) => (
                    <div 
                      key={h.firestoreId} 
                      onClick={() => setSelectedHospital(h)} 
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderTop: idx === 0 ? '4px solid var(--cool)' : '1px solid var(--border-soft)', borderRadius: 20, padding: 28, cursor: 'pointer', transition: '0.3s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <div>
                          <div style={{ fontSize: 24, fontFamily: 'Instrument Serif', marginBottom: 4, color: 'var(--text-main)', fontWeight: 'bold' }}>{h.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: '500' }}>{h.location} · <span style={{ color: 'var(--cool)', fontWeight: 700 }}>{h.distance} km</span></div>
                        </div>
                        {idx === 0 && <span style={{ background: 'rgba(13, 95, 13, 0.1)', color: 'var(--cool)', padding: '6px 12px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>NEAREST</span>}
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <div style={{ flex: 1, padding: '12px', background: 'var(--bg-base)', borderRadius: 12, textAlign: 'center', border: '1px solid var(--border-soft)' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{h.icuBeds?.available || 0}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: '600' }}>ICU Beds</div>
                        </div>
                        <div style={{ flex: 1, padding: '12px', background: 'var(--bg-base)', borderRadius: 12, textAlign: 'center', border: '1px solid var(--border-soft)' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{h.generalBeds?.available || 0}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: '600' }}>General</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                         {h.bloodBank && Object.keys(h.bloodBank).length > 0 && <span style={{fontSize: 11, background: 'rgba(220,38,38,0.1)', color: 'var(--warm)', padding: '4px 8px', borderRadius: 6, fontWeight: 700, border: '1px solid rgba(220,38,38,0.2)'}}>Blood Bank Synced</span>}
                         {h.doctors && Object.keys(h.doctors).length > 0 && <span style={{fontSize: 11, background: 'rgba(13, 95, 13, 0.1)', color: 'var(--cool)', padding: '4px 8px', borderRadius: 6, fontWeight: 700, border: '1px solid rgba(13, 95, 13, 0.2)'}}>Specialists Live</span>}
                      </div>

                      <button style={{ width: '100%', padding: '14px', background: 'rgba(13, 95, 13, 0.05)', border: '1px solid rgba(13, 95, 13, 0.3)', borderRadius: 12, color: 'var(--cool)', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                        View Details & Book
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
              <h2 style={{ fontSize: 32, fontFamily: 'Instrument Serif', marginBottom: 8, color: 'var(--text-main)', fontWeight: 'bold' }}>AI Symptom Assistant</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: '500' }}>Describe how you feel, and our AI will direct you to the right specialist.</p>
            </div>
            
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 24, padding: 30, height: 450, overflowY: 'auto', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {chatMessages.map((msg, i) => {
                const mentionedHospital = msg.role === 'bot' 
                  ? hospitals.find(h => msg.text.toLowerCase().includes(h.name.toLowerCase())) 
                  : null;

                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                    <div style={{ maxWidth: '75%', padding: '14px 20px', background: msg.role === 'user' ? 'var(--cool)' : 'var(--bg-base)', borderRadius: 18, borderBottomRightRadius: msg.role === 'user' ? 4 : 18, borderBottomLeftRadius: msg.role === 'bot' ? 4 : 18, fontSize: 15, lineHeight: 1.5, border: msg.role === 'bot' ? '1px solid var(--border-soft)' : 'none', color: msg.role === 'user' ? 'white' : 'var(--text-main)', fontWeight: '500' }}>
                      {msg.text}
                    </div>
                    
                    {mentionedHospital && (
                      <button 
                        onClick={() => setAppointmentModal(mentionedHospital)}
                        style={{ marginTop: 8, padding: '10px 18px', background: 'var(--cool)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 12px rgba(13, 95, 13, 0.2)' }}
                      >
                        📅 Book Token at {mentionedHospital.name} →
                      </button>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: 'flex', gap: 12, background: 'var(--bg-surface)', padding: 12, borderRadius: 18, border: '1px solid var(--border-soft)' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="e.g. I have a sharp pain in my lower back..." style={{ flex: 1, padding: '14px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 15, outline: 'none', fontWeight: '500' }} />
              <button onClick={handleChat} style={{ padding: '0 24px', background: 'var(--cool)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Send →</button>
            </div>
          </div>
        )}

        {/* blood finder */}
        {activeTab === 'blood' && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 32, fontFamily: 'Instrument Serif', marginBottom: 8, color: 'var(--text-main)', fontWeight: 'bold' }}>Blood Availability</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: '500' }}>Real-time stock of blood units across our hospital network.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {hospitals.map(h => (
                <div key={h.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 24, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, borderBottom: '1px solid var(--border-soft)', paddingBottom: 12, color: 'var(--text-main)' }}>{h.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    {Object.entries(h.bloodBank || {}).map(([type, units]) => (
                      <div key={type} style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--bg-base)', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: units > 0 ? 'var(--warm)' : 'var(--text-faint)' }}>{units}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2, fontWeight: '600' }}>{type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          🟢 HOSPITAL DETAILS MODAL 
          ========================================== */}
      {selectedHospital && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', width: '100%', maxWidth: 850, borderRadius: 24, border: '1px solid var(--border-soft)', maxHeight: '90vh', overflowY: 'auto', padding: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, borderBottom: '1px solid var(--border-soft)', paddingBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 36, fontFamily: 'Instrument Serif', margin: 0, color: 'var(--text-main)', fontWeight: 'bold' }}>{selectedHospital.name}</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: 8, fontWeight: '500' }}>{selectedHospital.location} • Real-Time Resources</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHospital.name + ' ' + selectedHospital.location)}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', background: 'rgba(13, 95, 13, 0.1)', color: 'var(--cool)', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 'bold', border: '1px solid rgba(13, 95, 13, 0.2)' }}
                >
                  📍 View on Google Maps
                </a>
              </div>
              <button onClick={() => setSelectedHospital(null)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
              <div>
                <h3 style={{ fontSize: 16, color: 'var(--cool)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }}>Live Capacity</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <div style={{ flex: 1, padding: '16px', background: 'var(--bg-base)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--cool)' }}>{selectedHospital.icuBeds?.available || 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: '600' }}>ICU BEDS</div>
                  </div>
                  <div style={{ flex: 1, padding: '16px', background: 'var(--bg-base)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)' }}>{selectedHospital.ambulances?.available || 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: '600' }}>AMBULANCES</div>
                  </div>
                </div>

                <h3 style={{ fontSize: 16, color: 'var(--cool)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }}>Doctors On Duty</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedHospital.doctors && Object.entries(selectedHospital.doctors).length > 0 ? (
                    Object.entries(selectedHospital.doctors).map(([docName, docData]) => (
                      <div key={docName} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border-soft)' }}>
                        <span style={{ fontSize: 14, fontWeight: '600' }}>{docName}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: docData.available > 0 ? 'var(--cool)' : 'var(--warm)' }}>
                          {docData.available} Available
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-faint)', fontSize: 14, fontWeight: '500' }}>No specific doctor data available.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 16, color: 'var(--cool)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }}>Equipment Status</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {selectedHospital.equipment && Object.entries(selectedHospital.equipment).length > 0 ? (
                    Object.entries(selectedHospital.equipment).map(([eqName, eqData]) => (
                      <div key={eqName} style={{ padding: '8px 14px', background: eqData.available > 0 ? 'rgba(13, 95, 13, 0.1)' : 'rgba(220,38,38,0.1)', border: `1px solid ${eqData.available > 0 ? 'rgba(13, 95, 13, 0.3)' : 'rgba(220,38,38,0.3)'}`, borderRadius: 99, fontSize: 13, fontWeight: '600', color: 'var(--text-main)' }}>
                        {eqName}: {eqData.available > 0 ? 'Ready' : 'In Use/Maintenance'}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-faint)', fontSize: 14, fontWeight: '500' }}>No equipment tracking active.</p>
                  )}
                </div>

                <div style={{ background: 'var(--bg-base)', padding: '24px', borderRadius: 16, border: '1px solid var(--border-soft)' }}>
                  <h3 style={{ fontSize: 16, marginBottom: 16, fontWeight: '700', color: 'var(--text-main)' }}>Blood Bank</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {selectedHospital.bloodBank ? (
                      Object.entries(selectedHospital.bloodBank).map(([bType, bUnits]) => (
                        <div key={bType} style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-soft)' }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: bUnits > 0 ? 'var(--warm)' : 'var(--text-muted)' }}>{bUnits}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: '600' }}>{bType}</div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-faint)', fontSize: 12, gridColumn: 'span 4', fontWeight: '500' }}>No blood data synced.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, paddingTop: 20, borderTop: '1px solid var(--border-soft)' }}>
              <button onClick={() => setSelectedHospital(null)} style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: 12, color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer' }}>Close</button>
              <button 
                onClick={() => {
                  setAppointmentModal(selectedHospital); 
                  setSelectedHospital(null); 
                }} 
                style={{ flex: 1, padding: '16px', background: 'var(--cool)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 16 }}
              >
                Proceed to Book Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* booking modal */}
      {appointmentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 24, padding: 40, width: '100%', maxWidth: 450, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid var(--border-soft)' }}>
            {appointmentSent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <h3 style={{ fontSize: 26, marginBottom: 8, color: 'var(--cool)', fontWeight: 'bold' }}>Booking Confirmed!</h3>
                <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Redirecting to your dashboard...</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 26, marginBottom: 24, fontFamily: 'Instrument Serif', color: 'var(--text-main)', fontWeight: 'bold' }}>Book Appointment</h3>
                
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: '600' }}>Select Specialist</label>
                <select value={appointmentForm.selectedDoctor} onChange={e => setAppointmentForm(p => ({ ...p, selectedDoctor: e.target.value }))} style={{ width: '100%', padding: '14px', marginBottom: 12, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-soft)', fontSize: 15, outline: 'none', fontWeight: '500' }}>
                  <option value="">Any Available Doctor</option>
                  {appointmentModal.doctors && Object.keys(appointmentModal.doctors).map(docName => (
                    <option key={docName} value={docName}>{docName}</option>
                  ))}
                </select>

                <div style={{ marginBottom: 24, padding: '14px 16px', background: 'rgba(13, 95, 13, 0.05)', borderRadius: 12, border: '1px solid rgba(13, 95, 13, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: '600' }}>Consultation Fee:</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--cool)' }}>₹{appointmentForm.selectedDoctor && appointmentModal.doctors[appointmentForm.selectedDoctor] ? (appointmentModal.doctors[appointmentForm.selectedDoctor].fee || 500) : 500}</span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <input placeholder="Full Name" value={appointmentForm.name} onChange={e => setAppointmentForm(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-soft)', fontSize: 15, outline: 'none', fontWeight: '500' }} />
                  <input type="number" placeholder="Phone (10 digits)" value={appointmentForm.phone} onChange={e => setAppointmentForm(p => ({ ...p, phone: e.target.value.slice(0, 10) }))} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-soft)', fontSize: 15, outline: 'none', fontWeight: '500' }} />
                </div>

                <input type="number" placeholder="Aadhaar Number (12 digits)" value={appointmentForm.aadhaar} onChange={e => setAppointmentForm(p => ({ ...p, aadhaar: e.target.value.slice(0, 12) }))} style={{ width: '100%', padding: 14, marginBottom: 12, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-soft)', fontSize: 15, outline: 'none', fontWeight: '500' }} />

                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: '600' }}>Time Slot</label>
                <select value={appointmentForm.time} onChange={e => setAppointmentForm(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: 14, marginBottom: 12, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-soft)', fontSize: 15, outline: 'none', fontWeight: '500' }}>
                  <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                  <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                </select>

                <textarea placeholder="Describe symptoms (optional)" value={appointmentForm.symptoms} onChange={e => setAppointmentForm(p => ({ ...p, symptoms: e.target.value }))} rows={2} style={{ width: '100%', padding: 14, marginBottom: 24, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-soft)', resize: 'none', fontSize: 15, outline: 'none', fontWeight: '500' }} />

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setAppointmentModal(null)} style={{ flex: 1, padding: 14, background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-soft)', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                  <button onClick={handleAppointmentSubmit} style={{ flex: 1, padding: 14, background: 'var(--cool)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 800 }}>Confirm</button>
                </div>
              </>
            )}
          </div>
        </div>
      )} 
    </div>
  )
}