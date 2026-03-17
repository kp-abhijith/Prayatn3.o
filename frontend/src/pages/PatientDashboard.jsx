import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const [location, setLocation] = useState('');
  const [locationSet, setLocationSet] = useState(false);

  const [peopleAhead, setPeopleAhead] = useState(0);
  const [myAppointments, setMyAppointments] = useState([]);
  const [hospitalQueues, setHospitalQueues] = useState({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // live queue counter logic
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "appointments"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const totalPending = snapshot.docs.length;
      setPeopleAhead(Math.max(0, totalPending - 1)); 
    });

    return () => unsubscribe();
  }, []);

  // fetch user tokens and specific hospital queues
  useEffect(() => {
    if (!user) return;

    const qMyApps = query(collection(db, 'appointments'), where('patientUid', '==', user.uid));
    const unsubMyApps = onSnapshot(qMyApps, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      apps.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setMyAppointments(apps);

      apps.forEach(app => {
        if (app.status === 'pending' || app.status === 'confirmed') {
          const qQueue = query(collection(db, 'appointments'), where('hospitalId', '==', app.hospitalId));
          onSnapshot(qQueue, (queueSnap) => {
            const queueData = queueSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const activeQueue = queueData.filter(q => q.status === 'pending' || q.status === 'confirmed');
            activeQueue.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
            setHospitalQueues(prev => ({ ...prev, [app.hospitalId]: activeQueue }));
          });
        }
      });
    });

    return () => unsubMyApps();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMyAppointments([]);
    navigate('/');
  };

  // 🟢 LOGIN SCREEN (GREEN THEME)
  if (!user) {
    return (
      <div style={{ 
        '--bg-base': '#f0f5f3', '--bg-surface': '#ffffff', '--border-soft': '#d1e5dd', '--cool': '#0d5f0d', '--text-main': '#0f172a',
        minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' 
      }}>
        <div style={{ background: 'var(--bg-surface)', padding: 40, borderRadius: 24, width: '100%', maxWidth: 400, border: '1px solid var(--border-soft)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14, fontWeight: 600 }}>← Back to Home</button>
          <h2 style={{ fontSize: 32, fontFamily: 'Instrument Serif', marginBottom: 8, textAlign: 'center', color: 'var(--text-main)', fontWeight: 'bold' }}>Patient Portal</h2>
          <p style={{ color: '#475569', fontSize: 14, textAlign: 'center', marginBottom: 32, fontWeight: 500 }}>Log in to track your live queue status.</p>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: 14, borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: 14, borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }} />
            <button type="submit" style={{ padding: 14, background: 'var(--cool)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', marginTop: 8, fontSize: 16 }}>{isLogin ? 'Sign In' : 'Sign Up'}</button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#475569', fontWeight: 500 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => setIsLogin(!isLogin)} style={{ color: 'var(--cool)', cursor: 'pointer', fontWeight: 700 }}>{isLogin ? 'Sign Up' : 'Log In'}</span>
          </div>
        </div>
      </div>
    );
  }

  // 🟢 LOCATION SCREEN
  if (!locationSet) {
    return (
      <div style={{ 
        '--bg-base': '#f0f5f3', '--cool': '#0d5f0d', '--text-main': '#0f172a',
        minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' 
      }}>
        <div style={{ background: '#ffffff', padding: 40, borderRadius: 24, width: '100%', maxWidth: 450, border: '1px solid #d1e5dd', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: 32, fontFamily: 'Instrument Serif', marginBottom: 10, textAlign: 'center', color: 'var(--text-main)', fontWeight: 'bold' }}>Where are you?</h2>
          <p style={{ color: '#475569', fontSize: 15, textAlign: 'center', marginBottom: 24, fontWeight: 500 }}>Enter your city to find nearby hospitals and book a token.</p>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Indore, Bhopal" onKeyDown={e => e.key === 'Enter' && location.trim() && setLocationSet(true)} style={{ width: '100%', padding: 16, borderRadius: 12, border: '1px solid #d1e5dd', background: 'var(--bg-base)', fontSize: 15, color: 'var(--text-main)', outline: 'none', marginBottom: 20, fontWeight: 600 }} />
          <button onClick={() => { if(location.trim()) setLocationSet(true); else alert('Enter city!'); }} style={{ width: '100%', padding: 16, background: 'var(--cool)', border: 'none', borderRadius: 12, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>Continue</button>
          <button onClick={handleLogout} style={{ marginTop: 16, width: '100%', padding: 12, background: 'transparent', color: '#64748b', border: '1px solid #d1e5dd', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>← Sign Out</button>
        </div>
      </div>
    );
  }

  // 🟢 DASHBOARD (GREEN THEME + HIGH CONTRAST)
  return (
    <div style={{ 
      '--bg-base': '#f0f5f3', '--cool': '#0d5f0d', '--sage': '#16a34a', '--text-main': '#0f172a', '--text-muted': '#475569',
      minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' 
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 38, fontFamily: 'Instrument Serif', marginBottom: 4, color: 'var(--text-main)', fontWeight: 'bold' }}>My Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Logged in: <span style={{color: 'var(--cool)', fontWeight: 700}}>{user.email}</span></p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/patient', { state: { location } })} style={{ padding: '12px 20px', background: 'var(--cool)', border: 'none', borderRadius: 12, color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(13, 95, 13, 0.2)' }}>+ New Appointment</button>
            <button onClick={handleLogout} style={{ padding: '12px 20px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>Sign Out</button>
          </div> 
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--text-main)', borderLeft: '4px solid var(--cool)', paddingLeft: 12 }}>Active Token Tracker</h2>
        
        {myAppointments.length === 0 && (
          <div style={{ background: '#fff', padding: 50, borderRadius: 20, border: '1px solid #d1e5dd', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>You have no active appointments.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {myAppointments.map(app => {
            let peopleAhead = 0;
            const hospitalQueue = hospitalQueues[app.hospitalId];
            if (hospitalQueue && (app.status === 'pending' || app.status === 'confirmed')) {
              const myIndex = hospitalQueue.findIndex(q => q.id === app.id);
              if (myIndex !== -1) peopleAhead = myIndex; 
            }

            return (
              <div key={app.id} style={{ background: '#ffffff', padding: '28px', borderRadius: 24, border: '1px solid #d1e5dd', display: 'flex', gap: 24, flexWrap: 'wrap', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', transition: '0.3s' }}>
                
                {/* 🎫 TOKEN CARD */}
                <div style={{ background: 'var(--bg-base)', border: '2px dashed #0d5f0d', padding: '24px', borderRadius: 18, textAlign: 'center', minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: 'var(--cool)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, fontWeight: 800 }}>Your Token</div>
                  <div style={{ fontSize: 38, fontFamily: 'Instrument Serif', color: 'var(--cool)', lineHeight: 1, fontWeight: 'bold' }}>{app.tokenNumber || 'TKN-???'}</div>
                  <div style={{ fontSize: 11, color: app.status === 'confirmed' ? '#fff' : 'var(--cool)', marginTop: 14, padding: '6px 12px', background: app.status === 'confirmed' ? 'var(--sage)' : 'rgba(13, 95, 13, 0.1)', borderRadius: 99, display: 'inline-block', textTransform: 'uppercase', fontWeight: 800 }}>{app.status}</div>
                </div>

                {/* 🏥 HOSPITAL DETAILS */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: 24, marginBottom: 6, color: 'var(--text-main)', fontWeight: 800 }}>{app.hospitalName}</h3>
                  <div style={{ fontSize: 16, color: 'var(--cool)', marginBottom: 10, fontWeight: 700 }}>👨‍⚕️ Dr. {app.doctorName} &nbsp;|&nbsp; 🕒 {app.timePreference}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <strong style={{color: 'var(--text-main)'}}>Patient Notes:</strong> {app.symptoms}
                  </div>
                </div>

                {/* 🔢 LIVE QUEUE BLOCK */}
                {(app.status === 'pending' || app.status === 'confirmed') && (
                  <div style={{ background: 'rgba(13, 95, 13, 0.05)', border: '1px solid rgba(13, 95, 13, 0.2)', padding: 24, borderRadius: 20, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: 'var(--cool)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>Queue Status</div>
                    {peopleAhead === 0 ? (
                      <div style={{ fontSize: 20, color: 'var(--sage)', fontWeight: 800 }}>You are next! 🏃‍♂️</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 36, fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>{peopleAhead}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, marginTop: 4 }}>people ahead of you</div>
                      </>
                    )}
                  </div>
                )}
                
                {app.status === 'completed' && (
                  <div style={{ minWidth: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700, fontSize: 16, background: '#f1f5f9', borderRadius: 20, border: '1px dashed #cbd5e1' }}>✅ Appointment Finished</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}