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

  // const validateEmail = (e) => {
  //   console.log("validating...")
  //   // todo: add regex check later
  // }

  // handle firebase login
  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in both fields')
      return
    }
    setError('')
    setLoading(true)
    
    // console.log("attempting login for:", email)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err) {
      // map firebase errors to readable text
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
      '--bg-base': '#f5f1e7', 
      '--bg-surface': '#ffffff', 
      '--bg-raised': '#fcfbf8',
      '--border-soft': '#e8e3d8', 
      '--cool': '#8c7362', 
      '--sage': '#6d8a70', 
      '--warm': '#d49679', 
      '--clay': '#c26d6d',
      '--amber': '#d4a373',
      '--text-primary': '#363431',
      '--text-muted': '#7a7671',
      '--text-faint': '#a39f9a',
      minHeight:'100vh', background:'var(--bg-base)', color: 'var(--text-primary)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', fontFamily: 'IBM Plex Sans, sans-serif' 
    }}>

      {/* critical alert banner */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:36, background:'rgba(194,109,109,0.1)', borderBottom:'1px solid rgba(194,109,109,0.2)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
        <span style={{ fontSize:12, color:'var(--clay)', fontWeight: 600 }}>🔴 &nbsp; 3 critical alerts in local hospitals right now</span>
      </div>

      <div style={{ position:'fixed', top:-100, left:-100, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(140, 115, 98,0.08), transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-100, right:-100, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(109,138,112,0.08), transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }}/>

      <div style={{ width:'90%', maxWidth:440, margin:'0 auto', background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderLeft:'3px solid rgba(140, 115, 98, 0.4)', borderRadius:16, padding:'44px 40px', position:'relative', zIndex:1, marginTop:36, boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>

        <div style={{ marginBottom:8 }}>
          <div style={{ width:40, height:40, background:'rgba(140, 115, 98, 0.1)', borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:14 }}>🏥</div>
          <h1 style={{ fontSize:38, margin:'0 0 4px 0', letterSpacing:'-0.5px', fontFamily: 'Instrument Serif' }}>MediSync</h1>
          <div style={{ width:40, height:2, background:'var(--cool)', margin:'8px 0 12px 0' }}/>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>Real-time hospital resource coordination</p>
        </div>

        <div style={{ height:1, background:'var(--border-soft)', margin:'24px 0' }}/>

        {/* role selection screen */}
        {step === 'home' && (
          <div>
            <p style={{ fontSize:10, letterSpacing:2, color:'var(--text-faint)', textTransform:'uppercase', marginBottom:12 }}>Continue as</p>

            <button
              onClick={() => setStep('doctor')}
              style={{ width:'100%', padding:16, background:'rgba(140, 115, 98, 0.04)', border:'1px solid rgba(140, 115, 98, 0.2)', borderLeft:'2px solid rgba(140, 115, 98, 0.6)', borderRadius:12, cursor:'pointer', display:'flex', alignItems:'center', gap:14, marginBottom:10, position:'relative', transition: '0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(140, 115, 98, 0.5)'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(140, 115, 98, 0.2)'; e.currentTarget.style.transform='translateY(0)' }}
            >
              <span style={{ position:'absolute', top:8, right:10, fontSize:9, color:'var(--cool)', letterSpacing:1, textTransform:'uppercase', fontWeight: 600 }}>Staff Access</span>
              <div style={{ width:38, height:38, background:'rgba(140, 115, 98, 0.1)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>👨‍⚕️</div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>Doctor / Staff</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Manage your hospital's resources</div>
              </div>
              <span style={{ marginLeft:'auto', color:'var(--text-faint)', fontSize:16 }}>→</span>
            </button>

            <button
              onClick={() => navigate('/patient-dashboard')}
              style={{ width:'100%', padding:16, background:'rgba(109,138,112,0.04)', border:'1px solid rgba(109,138,112,0.2)', borderLeft:'2px solid rgba(109,138,112,0.6)', borderRadius:12, cursor:'pointer', display:'flex', alignItems:'center', gap:14, position:'relative', transition: '0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(109,138,112,0.5)'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(109,138,112,0.2)'; e.currentTarget.style.transform='translateY(0)' }}
            >
              <span style={{ position:'absolute', top:8, right:10, fontSize:9, color:'var(--sage)', letterSpacing:1, textTransform:'uppercase', fontWeight: 600 }}>Live Tracking</span>
              <div style={{ width:38, height:38, background:'rgba(109,138,112,0.1)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🧑</div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>Patient Login</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Track tokens & book hospitals</div>
              </div>
              <span style={{ marginLeft:'auto', color:'var(--text-faint)', fontSize:16 }}>→</span>
            </button>

            <div style={{ display:'flex', marginTop:28, paddingTop:20, borderTop:'1px solid var(--border-soft)' }}>
              {[
                { num:'24',   label:'Hospitals', color:'var(--warm)' },
                { num:'1.2k', label:'Doctors',   color:'var(--sage)' },
                { num:'38',   label:'Alerts',    color:'var(--clay)' },
              ].map(({ num, label, color }, i) => (
                <div key={label} style={{ flex:1, textAlign:'center', borderRight: i < 2 ? '1px solid var(--border-soft)' : 'none' }}>
                  <div style={{ fontFamily:'Instrument Serif', fontSize:22, color }}>{num}</div>
                  <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* doctor login screen */}
        {step === 'doctor' && (
          <div>
            <button onClick={() => { setStep('home'); setError('') }} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, marginBottom:20, padding:0 }}>← Back</button>

            <h2 style={{ fontSize:22, marginBottom:6, color: 'var(--text-primary)' }}>Sign in to your hospital</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>Enter your hospital credentials</p>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--text-faint)', marginBottom:6 }}>Hospital Email</label>
              <input
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width:'100%', padding:'12px 14px', background:'var(--bg-raised)', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-primary)', fontSize:14, fontFamily:'IBM Plex Sans', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom:8 }}>
              <label style={{ display:'block', fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--text-faint)', marginBottom:6 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ width:'100%', padding:'12px 40px 12px 14px', background:'var(--bg-raised)', border:'1px solid var(--border-soft)', borderRadius:10, color:'var(--text-primary)', fontSize:14, fontFamily:'IBM Plex Sans', outline: 'none' }}
                />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--text-faint)' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <p style={{ fontSize:12, color:'var(--clay)', marginTop:6 }}>⚠️ {error}</p>}

            <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:8 }}>
              Demo: doctor@aiims.com / doctor123
            </p>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ width:'100%', padding:14, marginTop:16, background:'var(--cool)', border:'none', borderRadius:10, color:'white', fontSize:14, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>

            <p style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)', marginTop:16 }}>
              New hospital?{' '}
              <span style={{ color:'var(--cool)', cursor:'pointer', fontWeight: 600 }}>Register here</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}