import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // handle firebase login logic
  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in both fields')
      return
    }
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/doctor-dashboard') 
    } catch (err) {
      if (err.code === 'auth/user-not-found')   setError('No account found with this email')
      else if (err.code === 'auth/wrong-password') setError('Incorrect password')
      else if (err.code === 'auth/invalid-email')  setError('Invalid email address')
      else setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      '--bg-base': '#f0f5f3', 
      '--bg-surface': '#ffffff', 
      '--bg-raised': '#f8fdfa',
      '--border-soft': '#d1e5dd', 
      '--cool': '#0d5f0d',     
      '--sage': '#16a34a',     
      '--clay': '#dc2626',     
      '--text-primary': '#0f172a', 
      '--text-muted': '#475569',
      '--text-faint': '#64748b',
      minHeight:'100vh', background:'var(--bg-base)', color: 'var(--text-primary)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily: 'Inter, sans-serif' 
    }}>

      {/* critical alert banner */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:36, background:'rgba(220,38,38,0.1)', borderBottom:'1px solid rgba(220,38,38,0.2)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
        <span style={{ fontSize:12, color:'var(--clay)', fontWeight: 700 }}>🔴 &nbsp; Emergency tracking is currently live in your area</span>
      </div>

      <div style={{ position:'fixed', top:-100, left:-100, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(13, 95, 13,0.1), transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-100, right:-100, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(22, 163, 74,0.1), transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }}/>

      <div style={{ width:'90%', maxWidth:440, margin:'0 auto', background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderLeft:'5px solid var(--cool)', borderRadius:20, padding:'44px 40px', position:'relative', zIndex:1, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)' }}>

        <div style={{ marginBottom:8 }}>
          <div style={{ width:44, height:44, background:'rgba(13, 95, 13, 0.1)', borderRadius:12, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:16 }}>🏥</div>
          <h1 style={{ fontSize:40, margin:'0 0 6px 0', letterSpacing:'-1px', fontFamily: 'Instrument Serif', color: 'var(--text-primary)', fontWeight: 800 }}>MediSync</h1>
          <div style={{ width:50, height:3, background:'var(--cool)', borderRadius: 2 }}/>
          <p style={{ fontSize:14, color:'var(--text-muted)', marginTop: 12, fontWeight: 500 }}>Smart hospital resource coordination</p>
        </div>

        <div style={{ height:1, background:'var(--border-soft)', margin:'28px 0' }}/>

        {/* role selection screen */}
        {step === 'home' && (
          <div style={{ paddingBottom: 10 }}>
            <p style={{ fontSize:11, letterSpacing:2, color:'var(--text-faint)', textTransform:'uppercase', marginBottom:16, fontWeight: 700 }}>Select Access Type</p>

            <button
              onClick={() => setStep('doctor')}
              style={{ width:'100%', padding:20, background:'rgba(13, 95, 13, 0.04)', border:'1px solid var(--border-soft)', borderLeft:'4px solid var(--cool)', borderRadius:14, cursor:'pointer', display:'flex', alignItems:'center', gap:16, marginBottom:12, position:'relative', transition: '0.3s' }}
            >
              <div style={{ width:40, height:40, background:'rgba(13, 95, 13, 0.1)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>👨‍⚕️</div>
              <div style={{ textAlign:'left' }}>
                {/* 👇 YAHAN ADMIN CHANGE KIYA HAI */}
                <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>Admin</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Manage hospital resources & beds</div>
              </div>
              <span style={{ marginLeft:'auto', color:'var(--cool)', fontWeight: 800 }}>→</span>
            </button>

            <button
              onClick={() => navigate('/patient')}
              style={{ width:'100%', padding:20, background:'rgba(22, 163, 74, 0.04)', border:'1px solid var(--border-soft)', borderLeft:'4px solid var(--sage)', borderRadius:14, cursor:'pointer', display:'flex', alignItems:'center', gap:16, transition: '0.3s' }}
            >
              <div style={{ width:40, height:40, background:'rgba(22, 163, 74, 0.1)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🧑</div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>Patient Portal</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Track live status & booking</div>
              </div>
              <span style={{ marginLeft:'auto', color:'var(--sage)', fontWeight: 800 }}>→</span>
            </button>
          </div>
        )}

        {/* admin login screen */}
        {step === 'doctor' && (
          <div>
            <button onClick={() => { setStep('home'); setError('') }} style={{ background:'none', border:'none', color:'var(--cool)', cursor:'pointer', fontSize:14, marginBottom:24, padding:0, fontWeight: 700 }}>← Back</button>

            {/* 👇 YAHAN BHI ADMIN KIYA HAI */}
            <h2 style={{ fontSize:26, marginBottom:8, color: 'var(--text-primary)', fontWeight: 800 }}>Admin Sign-in</h2>
            <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:28, fontWeight: 500 }}>Secure access for hospital administrators</p>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, textTransform:'uppercase', letterSpacing:1, color:'var(--cool)', marginBottom:8, fontWeight: 800 }}>Official Email</label>
              <input
                type="email" placeholder="admin@hospital.com" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width:'100%', padding:'14px', background:'var(--bg-raised)', border:'1px solid var(--border-soft)', borderRadius:12, color:'var(--text-primary)', fontSize:15, outline: 'none', fontWeight: 600 }}
              />
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, textTransform:'uppercase', letterSpacing:1, color:'var(--cool)', marginBottom:8, fontWeight: 800 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ width:'100%', padding:'14px 44px 14px 14px', background:'var(--bg-raised)', border:'1px solid var(--border-soft)', borderRadius:12, color:'var(--text-primary)', fontSize:15, outline: 'none', fontWeight: 600 }}
                />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:18 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <p style={{ fontSize:13, color:'var(--clay)', marginTop:10, fontWeight: 600 }}>⚠️ {error}</p>}

            <button
              onClick={handleLogin} disabled={loading}
              style={{ width:'100%', padding:16, marginTop:24, background:'var(--cool)', border:'none', borderRadius:12, color:'white', fontSize:15, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 10px 20px rgba(13, 95, 13, 0.15)' }}
            >
              {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}