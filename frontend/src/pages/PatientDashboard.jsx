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
  const [peopleAhead, setPeopleAhead] = useState(0);
  const [myAppointments, setMyAppointments] = useState([]);
  const [hospitalQueues, setHospitalQueues] = useState({});

  // 1. Listen for Logged-In User
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);
  // 🧮 LIVE QUEUE COUNTER
  useEffect(() => {
    // If the user isn't logged in, don't try to count
    if (!auth.currentUser) return;

    // Create a rule: "Count every appointment that is still pending"
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "pending")
    );

    // onSnapshot listens to Firebase LIVE. Every time a doctor confirms/rejects someone, this runs again instantly!
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const totalPending = snapshot.docs.length;
      
      // The queue ahead of you is the total pending people, minus yourself!
      // (Using Math.max(0, ...) so it never goes into negative numbers)
      setPeopleAhead(Math.max(0, totalPending - 1)); 
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch User's Live Tokens & The Hospital Queues
  useEffect(() => {
    if (!user) return;

    // Fetch My Appointments
    const qMyApps = query(collection(db, 'appointments'), where('patientUid', '==', user.uid));
    const unsubMyApps = onSnapshot(qMyApps, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      apps.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setMyAppointments(apps);

      // Fetch the live queue for the hospitals I am waiting at
      apps.forEach(app => {
        if (app.status === 'pending' || app.status === 'confirmed') {
          const qQueue = query(collection(db, 'appointments'), where('hospitalId', '==', app.hospitalId));
          onSnapshot(qQueue, (queueSnap) => {
            const queueData = queueSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Only count people who are waiting or confirmed
            const activeQueue = queueData.filter(q => q.status === 'pending' || q.status === 'confirmed');
            // Sort by who booked first (oldest first)
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
        // Logging in an existing user
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in successfully!");
      } else {
        // Creating a brand new user
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("Account created successfully!");
      }
    } catch (error) {
      // 🔥 THIS POPUP WILL TELL YOU EXACTLY WHAT IS WRONG
      alert("Firebase Error: " + error.message);
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMyAppointments([]);
  };

  // --- UI: LOGIN/SIGNUP SCREEN ---
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--bg-surface)', padding: 40, borderRadius: 16, width: '100%', maxWidth: 400, border: '1px solid var(--border-soft)' }}>
          
          {/* BACK TO HOME BUTTON */}
          <button 
            onClick={() => navigate('/')} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14, padding: 0 }}
          >
            ← Back to Home
          </button>

          <h2 style={{ fontSize: 28, fontFamily: 'Instrument Serif', marginBottom: 8, textAlign: 'center' }}>Patient Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginBottom: 32 }}>Log in to track your live queue status.</p>  
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: 12, borderRadius: 8, background: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: 'white' }} />
            <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: 12, borderRadius: 8, background: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: 'white' }} />
            <button type="submit" style={{ padding: 12, background: 'var(--cool)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
             {isLogin ? 'Sign In' : 'Sign Up'} 
            </button>
          </form>
          
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ color: 'var(--sage)', cursor: 'pointer', fontWeight: 600 }}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </span>
          </div>
        
        </div>
      </div>
    );
  }

 // --- UI: LIVE TOKEN DASHBOARD ---
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* THE UPDATED HEADER WITH THE BOOK BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontFamily: 'Instrument Serif', marginBottom: 4 }}>My Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Logged in as: {user.email}</p>
          </div>
         <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/patient')} style={{ padding: '8px 16px', background: 'var(--cool)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600 }}>+ Book Appointment</button>
            <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Sign Out</button>
          </div> 
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Live Token Tracker</h2>
        
        {myAppointments.length === 0 && (
          <div style={{ background: 'var(--bg-surface)', padding: 40, borderRadius: 16, border: '1px solid var(--border-soft)', textAlign: 'center', color: 'var(--text-muted)' }}>
            You have no active appointments.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {myAppointments.map(app => {
            // 🧮 LIVE QUEUE MATH
            let peopleAhead = 0;
            let estimatedWaitMins = 0;
            const hospitalQueue = hospitalQueues[app.hospitalId];

            if (hospitalQueue && (app.status === 'pending' || app.status === 'confirmed')) {
              // Find exactly where I am in the hospital's queue
              const myIndex = hospitalQueue.findIndex(q => q.id === app.id);
              if (myIndex !== -1) {
                peopleAhead = myIndex; 
                estimatedWaitMins = peopleAhead * 15; // Assume 15 mins per patient
              }
            }

            return (
              <div key={app.id} style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border-soft)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                
                {/* Left: Token Display */}
                <div style={{ background: 'var(--bg-base)', border: '1px dashed var(--border-soft)', padding: '20px', borderRadius: 12, textAlign: 'center', minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Your Token</div>
                  <div style={{ fontSize: 32, fontFamily: 'Instrument Serif', color: 'var(--warm)', lineHeight: 1 }}>{app.tokenNumber || 'TKN-???'}</div>
                  <div style={{ fontSize: 12, color: app.status === 'confirmed' ? 'var(--sage)' : 'var(--amber)', marginTop: 8, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 99, display: 'inline-block', textTransform: 'uppercase' }}>
                    ● {app.status}
                  </div>
                </div>

                {/* Middle: Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: 20, marginBottom: 4 }}>{app.hospitalName}</h3>
                  <div style={{ fontSize: 14, color: 'var(--cool)', marginBottom: 8 }}>👨‍⚕️ {app.doctorName} &nbsp;|&nbsp; 🕒 {app.timePreference}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}><strong>Symptoms:</strong> {app.symptoms}</div>
                </div>

                {/* Right: Live Queue Status */}
                {(app.status === 'pending' || app.status === 'confirmed') && (
                  <div style={{ background: 'rgba(91,130,196,0.05)', border: '1px solid rgba(91,130,196,0.2)', padding: 20, borderRadius: 12, minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Live Queue Status</div>
                    
                    {peopleAhead === 0 ? (
                      <div style={{ fontSize: 18, color: 'var(--sage)', fontWeight: 600, animation: 'pulse 2s infinite' }}>🟢 You are next!</div>
                    ) : (
                      <>
                      {/* Replace the 4 with the live variable */}
<div style={{ fontSize: 24, fontWeight: 'bold' }}>{peopleAhead}</div>
<div style={{ color: 'var(--text-muted)' }}>people ahead</div>
                        
                      </>
                    )}
                  </div>
                )}
                
                {app.status === 'completed' && (
                  <div style={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
                    Appointment Completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}