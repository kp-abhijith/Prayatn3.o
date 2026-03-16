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

  // check auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // live queue counter logic
  useEffect(() => {
    if (!auth.currentUser) return;

    // get all pending appointments globally
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const totalPending = snapshot.docs.length;
      // console.log("total pending in db:", totalPending);
      
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

      // fetch live queue for hospitals im waiting at
      apps.forEach(app => {
        if (app.status === 'pending' || app.status === 'confirmed') {
          // console.log("fetching queue for hospital:", app.hospitalId)
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


  // const testQueueMath = () => {
  //   console.log("running old math")
  //   return myAppointments.length - 1;
  // }


  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("logged in ok");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("account created");
      }
    } catch (error) {
      alert("Error: " + error.message);
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMyAppointments([]);
  };

  // login screen
  if (!user) {
    return (
      <div style={{ 
        '--bg-base': '#f5f1e7', 
        '--bg-surface': '#ffffff', 
        '--border-soft': '#e8e3d8', 
        '--cool': '#8c7362', 
        '--sage': '#6d8a70', 
        '--warm': '#d49679', 
        '--text-muted': '#7a7671',
        minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'IBM Plex Sans, sans-serif' 
      }}>
        <div style={{ background: 'var(--bg-surface)', padding: 40, borderRadius: 16, width: '100%', maxWidth: 400, border: '1px solid var(--border-soft)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          
          <button 
            onClick={() => navigate('/')} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14, padding: 0 }}
          >
            ← Back to Home
          </button>

          <h2 style={{ fontSize: 28, fontFamily: 'Instrument Serif', marginBottom: 8, textAlign: 'center', color: '#363431' }}>Patient Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginBottom: 32 }}>Log in to track your live queue status.</p>  
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: 12, borderRadius: 8, background: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: '#363431', outline: 'none' }} />
            <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: 12, borderRadius: 8, background: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: '#363431', outline: 'none' }} />
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

  // live token dashboard
  return (
    <div style={{ 
      '--bg-base': '#f5f1e7', 
      '--bg-surface': '#ffffff', 
      '--border-soft': '#e8e3d8', 
      '--cool': '#8c7362', 
      '--sage': '#6d8a70', 
      '--warm': '#d49679', 
      '--amber': '#d4a373',
      '--text-muted': '#7a7671',
      '--text-faint': '#a39f9a',
      minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px', color: '#363431', fontFamily: 'IBM Plex Sans, sans-serif' 
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontFamily: 'Instrument Serif', marginBottom: 4 }}>My Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Logged in as: {user.email}</p>
          </div>
         <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/patient')} style={{ padding: '8px 16px', background: 'var(--cool)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600 }}>+ Book Appointment</button>
            <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: 8, color: '#363431', cursor: 'pointer' }}>Sign Out</button>
          </div> 
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Live Token Tracker</h2>
        
        {myAppointments.length === 0 && (
          <div style={{ background: 'var(--bg-surface)', padding: 40, borderRadius: 16, border: '1px solid var(--border-soft)', textAlign: 'center', color: 'var(--text-muted)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            You have no active appointments.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {myAppointments.map(app => {
            
            let peopleAhead = 0;
            let estimatedWaitMins = 0;
            const hospitalQueue = hospitalQueues[app.hospitalId];

            if (hospitalQueue && (app.status === 'pending' || app.status === 'confirmed')) {
              const myIndex = hospitalQueue.findIndex(q => q.id === app.id);
              if (myIndex !== -1) {
                peopleAhead = myIndex; 
                estimatedWaitMins = peopleAhead * 15; 
              }
            }

            return (
              <div key={app.id} style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border-soft)', display: 'flex', gap: 24, flexWrap: 'wrap', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                
                {/* token */}
                <div style={{ background: 'var(--bg-base)', border: '1px dashed var(--border-soft)', padding: '20px', borderRadius: 12, textAlign: 'center', minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Your Token</div>
                  <div style={{ fontSize: 32, fontFamily: 'Instrument Serif', color: 'var(--cool)', lineHeight: 1 }}>{app.tokenNumber || 'TKN-???'}</div>
                  <div style={{ fontSize: 12, color: app.status === 'confirmed' ? 'var(--sage)' : 'var(--warm)', marginTop: 8, padding: '4px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: 99, display: 'inline-block', textTransform: 'uppercase', fontWeight: 600 }}>
                    {app.status}
                  </div>
                </div>

                {/* details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: 20, marginBottom: 4 }}>{app.hospitalName}</h3>
                  <div style={{ fontSize: 14, color: 'var(--sage)', marginBottom: 8, fontWeight: 500 }}>Dr. {app.doctorName} &nbsp;|&nbsp; {app.timePreference}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}><strong>Notes:</strong> {app.symptoms}</div>
                </div>

                {/* live queue block */}
                {(app.status === 'pending' || app.status === 'confirmed') && (
                  <div style={{ background: 'rgba(140, 115, 98, 0.05)', border: '1px solid rgba(140, 115, 98, 0.2)', padding: 20, borderRadius: 12, minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Live Queue Status</div>
                    
                    {peopleAhead === 0 ? (
                      <div style={{ fontSize: 18, color: 'var(--sage)', fontWeight: 600 }}>You are next in line!</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--cool)' }}>{peopleAhead}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>people ahead</div>
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