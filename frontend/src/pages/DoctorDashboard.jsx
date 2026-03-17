import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { ALERTS } from '../data/mockData' 
import ResourceBar from '../components/ResourceBar'
import AlertItem from '../components/AlertItem'
import UpdateModal from '../components/UpdateModal'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [activeHospital, setActiveHospital] = useState(0)
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState(ALERTS)
  const [modal, setModal] = useState(null)
  
  // transfers state
  const [transfers, setTransfers] = useState([])
  const [transferModal, setTransferModal] = useState(false)
  const [transferForm, setTransferForm] = useState({ toHospitalId: '', resource: 'Blood O+', qty: 1, urgent: false })
  
  const [appointments, setAppointments] = useState([])

  // fetch hospitals
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hospitals'), snapshot => {
      const data = snapshot.docs
        .map(d => ({ ...d.data(), firestoreId: d.id }))
        .sort((a, b) => a.id - b.id)
      setHospitals(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const hospital = hospitals[activeHospital]
  
  // get appointments live
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'appointments'), snapshot => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }));
      if (hospital) {
        const filtered = data.filter(app => app.hospitalId === hospital.firestoreId || app.hospitalId === hospital.id);
        filtered.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setAppointments(filtered);
      }
    });
    return () => unsub();
  }, [hospital]);

  // transfer listener (b2b)
  useEffect(() => {
    if (!hospital) return;
    const unsub = onSnapshot(collection(db, 'transfers'), snapshot => {
      const allTransfers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const targetId = hospital.firestoreId || hospital.id;
      
      const myTransfers = allTransfers.filter(t => t.fromId === targetId || t.toId === targetId);
      myTransfers.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTransfers(myTransfers);
    });
    return () => unsub();
  }, [hospital]);

  const tabs = [
    { id:'overview',     label:'Overview',   icon:'📊' },
    { id:'resources',    label:'Resources',  icon:'🏥' },
    { id:'transfers',    label:'Transfers',  icon:'🔄' },
    { id:'appointments', label:'Appointments', icon:'📋' },
    { id:'bloodbank',    label:'Blood Bank', icon:'🩸' },
  ]

  const totalICU      = hospitals.reduce((s, h) => s + (h.icuBeds?.available || 0), 0)
  const totalBeds     = hospitals.reduce((s, h) => s + (h.generalBeds?.available || 0), 0)
  const totalAmb      = hospitals.reduce((s, h) => s + (h.ambulances?.available || 0), 0)
  const criticalCount = alerts.filter(a => a.level === 'critical').length

  const handleSave = async (type, itemLabel, newValue) => {
    if (!hospital) return
    const ref = doc(db, 'hospitals', hospital.firestoreId)
    try {
      if (itemLabel === 'ICU Beds') await updateDoc(ref, { 'icuBeds.available': newValue })
      else if (itemLabel === 'General Beds') await updateDoc(ref, { 'generalBeds.available': newValue })
      else if (itemLabel === 'Ambulances') await updateDoc(ref, { 'ambulances.available': newValue })
      else if (type === 'doctors') await updateDoc(ref, { [`doctors.${itemLabel}.available`]: newValue })
      else if (type === 'equipment') await updateDoc(ref, { [`equipment.${itemLabel}.available`]: newValue })
    } catch (err) { console.error('Update failed:', err) }
    setModal(null)
  }

  const handleUpdateAppointment = async (appId, newStatus) => {
    try { await updateDoc(doc(db, 'appointments', appId), { status: newStatus }); } 
    catch (err) { console.error("Failed to update status:", err); }
  };

  const handleApproveAndSchedule = async (appId) => {
    const selectedTime = document.getElementById(`time-${appId}`).value;
    try { await updateDoc(doc(db, 'appointments', appId), { status: 'confirmed', timePreference: selectedTime }); } 
    catch (err) { console.error("Failed to schedule:", err); }
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.toHospitalId) return alert("Please select a destination hospital");
    try {
      const toHospital = hospitals.find(h => (h.firestoreId || h.id).toString() === transferForm.toHospitalId.toString());
      await addDoc(collection(db, 'transfers'), {
        fromId: hospital.firestoreId || hospital.id,
        fromName: hospital.name,
        toId: toHospital.firestoreId || toHospital.id,
        toName: toHospital.name,
        resource: transferForm.resource,
        qty: Number(transferForm.qty),
        urgent: transferForm.urgent,
        status: 'pending',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp()
      });
      setTransferModal(false);
      setTransferForm({ toHospitalId: '', resource: 'Blood O+', qty: 1, urgent: false });
    } catch (err) { console.error("Transfer error:", err); }
  };

  const handleUpdateTransfer = async (transferId, newStatus) => {
    try { await updateDoc(doc(db, 'transfers', transferId), { status: newStatus }); } 
    catch (err) { console.error("Update transfer error:", err); }
  };

  const handleDeleteTransfer = async (transferId) => {
    if (window.confirm("Are you sure you want to delete this transfer request?")) {
      try { await deleteDoc(doc(db, 'transfers', transferId)); } 
      catch (err) { console.error("Delete transfer error:", err); }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#f0f5f3', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:'Instrument Serif', fontSize:24, color:'#0d5f0d', fontWeight: 'bold' }}>Loading hospitals...</div>
    </div>
  )

  return (
    <div style={{ 
      '--bg-base': '#f0f5f3', 
      '--bg-surface': '#ffffff', 
      '--border-soft': '#d1e5dd', 
      '--cool': '#0d5f0d', 
      '--sage': '#16a34a', 
      '--warm': '#dc2626', 
      '--clay': '#b91c1c',
      '--text-muted': '#475569',
      '--text-faint': '#64748b',
      '--text-primary': '#0f172a',
      minHeight:'100vh', background:'var(--bg-base)', color:'var(--text-primary)', display:'flex', fontFamily: 'Inter, sans-serif' 
    }}>

      {/* 🟢 SIDEBAR */}
      <div style={{ width:240, background:'var(--bg-surface)', borderRight:'1px solid var(--border-soft)', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 }}>
        <div style={{ padding:'0 20px 24px', borderBottom:'1px solid var(--border-soft)' }}>
          <div style={{ fontSize:26, fontFamily:'Instrument Serif', color: 'var(--cool)', fontWeight: '900' }}>MediSync</div>
          <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:4, fontWeight: '600' }}>Doctor Dashboard</div>
        </div>

        <div style={{ padding:'16px 12px', borderBottom:'1px solid var(--border-soft)' }}>
          <div style={{ fontSize:11, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:1, marginBottom:10, paddingLeft:8, fontWeight: '700' }}>Your Hospital</div>
          {hospitals.map((h, i) => (
            <button key={h.id || h.firestoreId} onClick={() => setActiveHospital(i)} style={{ width:'100%', padding:'10px 12px', background: i === activeHospital ? 'rgba(13, 95, 13, 0.08)' : 'transparent', border: i === activeHospital ? '1px solid rgba(13, 95, 13, 0.2)' : '1px solid transparent', borderRadius:10, cursor:'pointer', textAlign:'left', marginBottom:4, transition: '0.2s' }}>
              <div style={{ fontSize:13, fontWeight: i === activeHospital ? 800 : 600, color: i === activeHospital ? 'var(--cool)' : 'var(--text-primary)' }}>{h.name}</div>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop: 2, fontWeight: '500' }}>{h.location}</div>
            </button>
          ))}
        </div>

        <div style={{ padding:'16px 12px', flex:1 }}>
          {tabs.map(tab => {
            const pendingIncoming = transfers.filter(t => t.toId === (hospital.firestoreId || hospital.id) && t.status === 'pending').length;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ width:'100%', padding:'12px 10px', background: activeTab === tab.id ? 'rgba(13, 95, 13, 0.08)' : 'transparent', border:'none', borderRadius:10, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:12, marginBottom:6, transition: '0.2s' }}>
                <span style={{ fontSize:16 }}>{tab.icon}</span>
                <span style={{ fontSize:14, color: activeTab === tab.id ? 'var(--cool)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 800 : 600 }}>{tab.label}</span>
                {tab.id === 'transfers' && pendingIncoming > 0 && (
                  <span style={{ marginLeft:'auto', background:'var(--clay)', color:'#fff', fontSize:11, padding:'2px 8px', borderRadius:99, fontWeight: 'bold' }}>{pendingIncoming}</span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ padding:'16px 12px', borderTop:'1px solid var(--border-soft)' }}>
          <button onClick={handleSignOut} style={{ width:'100%', padding:'12px 10px', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:10, cursor:'pointer', color:'#dc2626', fontSize:14, fontWeight: '700' }}>← Sign Out</button>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT */}
      <div style={{ flex:1, padding:'32px 40px', overflowY:'auto' }}>

        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:32, marginBottom:6, fontFamily: 'Instrument Serif', fontWeight: 'bold', color: 'var(--text-primary)' }}>{hospital?.name}</h2>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:14, color:'var(--text-muted)', fontWeight: '600' }}>{hospital?.location}</span>
            <span style={{ fontSize:11, padding:'4px 12px', background: hospital?.status === 'critical' ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)', color: hospital?.status === 'critical' ? 'var(--clay)' : 'var(--sage)', border:`1px solid ${hospital?.status === 'critical' ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)'}`, borderRadius:99, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {hospital?.status === 'critical' ? '⚠️ Critical' : '✅ Normal'}
            </span>
          </div>
        </div>

        {/* 🟢 OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display:'flex', gap:20, marginBottom:32, flexWrap:'wrap' }}>
              {[
                { icon:'🛏️', label:'ICU Beds Available', value:totalICU,      sub:'across network', color:'var(--cool)' },
                { icon:'🏥', label:'General Beds',       value:totalBeds,     sub:'across network', color:'var(--sage)' },
                { icon:'🚑', label:'Ambulances Ready',   value:totalAmb,      sub:'across network', color:'var(--cool)' },
                { icon:'🔴', label:'Critical Alerts',    value:criticalCount, sub:'need attention',   color:'var(--clay)' },
              ].map(card => (
                <div key={card.label} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:'24px', flex:1, minWidth:180, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                    <div style={{ width:38, height:38, background:`${card.color}15`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{card.icon}</div>
                    <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight: '700' }}>{card.label}</span>
                  </div>
                  <div style={{ fontFamily:'Instrument Serif', fontSize:38, color:card.color, lineHeight:1, fontWeight: 'bold' }}>{card.value}</div>
                  <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:8, fontWeight: '600' }}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
              <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize:16, fontWeight:800, marginBottom:20, display:'flex', justifyContent:'space-between', color: 'var(--text-primary)' }}>
                  <span>Live Alerts</span>
                  <span style={{ fontSize:12, color:'var(--text-faint)' }}>{alerts.length} active</span>
                </div>
                {alerts.length === 0 && <div style={{ fontSize:14, color:'var(--text-faint)', textAlign:'center', padding:20, fontWeight: '600' }}>No active alerts</div>}
                {alerts.map(a => (
                  <AlertItem key={a.id} {...a} onDismiss={() => setAlerts(prev => prev.filter(x => x.id !== a.id))} />
                ))}
              </div>

              <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize:16, fontWeight:800, marginBottom:20, color: 'var(--text-primary)' }}>Recent Transfers</div>
                {transfers.slice(0, 4).map(t => {
                  const isIncoming = t.toId === (hospital.firestoreId || hospital.id);
                  return (
                    <div key={t.id} style={{ padding:'16px', background:'#f8fafc', border:'1px solid var(--border-soft)', borderRadius:12, marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <span style={{ fontSize:14, fontWeight:800, color: 'var(--text-primary)' }}>{t.resource} <span style={{color:'var(--cool)'}}>× {t.qty}</span></span>
                        {t.urgent && <span style={{ fontSize:10, color:'var(--clay)', border:'1px solid rgba(220,38,38,0.3)', padding:'3px 8px', borderRadius:99, textTransform:'uppercase', fontWeight: 'bold' }}>Urgent</span>}
                      </div>
                      <div style={{ fontSize:13, color:'var(--text-muted)', fontWeight: '600'}}>
                        {isIncoming ? `📥 From: ${t.fromName}` : `📤 To: ${t.toName}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 🟢 RESOURCES TAB */}
        {activeTab === 'resources' && hospital && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>Beds & Ambulances</div>
              {[
                { icon:'🛏️', label:'ICU Beds',     available:hospital.icuBeds?.available,     total:hospital.icuBeds?.total     },
                { icon:'🛏️', label:'General Beds', available:hospital.generalBeds?.available, total:hospital.generalBeds?.total },
                { icon:'🚑', label:'Ambulances',   available:hospital.ambulances?.available,  total:hospital.ambulances?.total  },
              ].map(item => (
                <ResourceBar key={item.label} {...item} onUpdate={(label, available, total) => setModal({ label, available, total, type:'beds' })} />
              ))}
            </div>

            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>Doctors On Duty</div>
              {Object.entries(hospital.doctors || {}).map(([name, data]) => (
                <ResourceBar key={name} icon={data.icon} label={name} available={data.available} total={data.total} onUpdate={(label, available, total) => setModal({ label, available, total, type:'doctors' })} />
              ))}
            </div>

            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:24, gridColumn:'span 2', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>Equipment</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {Object.entries(hospital.equipment || {}).map(([name, data]) => (
                  <ResourceBar key={name} icon={data.icon} label={name} available={data.available} total={data.total} onUpdate={(label, available, total) => setModal({ label, available, total, type:'equipment' })} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🟢 TRANSFERS TAB */}
        {activeTab === 'transfers' && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:32, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div style={{ fontSize:20, fontWeight:800, color: 'var(--text-primary)' }}>B2B Resource Transfers</div>
              <button onClick={() => setTransferModal(true)} style={{ padding:'12px 20px', background:'var(--cool)', color:'white', border:'none', borderRadius:10, fontWeight:800, cursor:'pointer', fontSize:14 }}>
                + Request Resource
              </button>
            </div>

            {transfers.length === 0 && <div style={{ fontSize:14, color:'var(--text-faint)', textAlign:'center', padding:30, fontWeight: '600' }}>No active transfer requests.</div>}
            
            {transfers.map(t => {
              const isIncoming = t.toId === (hospital.firestoreId || hospital.id);
              
              return (
                <div key={t.id} style={{ padding:'20px', background:'#f8fafc', border:'1px solid var(--border-soft)', borderRadius:12, marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:16, fontWeight:900, color: 'var(--text-primary)' }}>{t.resource} <span style={{color:'var(--cool)'}}>× {t.qty}</span></span>
                    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                      {t.urgent && <span style={{ fontSize:10, color:'var(--clay)', border:'1px solid rgba(220,38,38,0.3)', padding:'4px 10px', borderRadius:99, textTransform:'uppercase', fontWeight: 'bold' }}>Urgent</span>}
                      <span style={{ fontSize:12, color: t.status === 'pending' ? '#d97706' : t.status === 'approved' ? 'var(--sage)' : 'var(--text-muted)', padding:'4px 12px', background:'rgba(0,0,0,0.05)', borderRadius:99, textTransform:'uppercase', fontWeight: 'bold' }}>{t.status}</span>
                      
                      {/* Delete Button */}
                      <button onClick={() => handleDeleteTransfer(t.id)} style={{ background:'transparent', border:'none', color:'var(--text-faint)', cursor:'pointer', padding:'2px 4px', fontSize:16, marginLeft:4 }} title="Delete Request">
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize:14, color:'var(--text-muted)', marginBottom:12, fontWeight: '600'}}>
                    {isIncoming ? `📥 Request From: ${t.fromName}` : `📤 Sent To: ${t.toName}`} · <span style={{color: 'var(--text-faint)'}}>{t.time || 'Just now'}</span>
                  </div>
                  
                  {isIncoming && t.status === 'pending' && (
                    <div style={{ display:'flex', gap:12 }}>
                      <button onClick={() => handleUpdateTransfer(t.id, 'approved')} style={{ padding:'10px 24px', background:'rgba(22, 163, 74, 0.1)', border:'1px solid rgba(22, 163, 74, 0.3)', borderRadius:10, color:'var(--sage)', cursor:'pointer', fontSize:14, fontWeight: '800' }}>✓ Approve</button>
                      <button onClick={() => handleUpdateTransfer(t.id, 'rejected')} style={{ padding:'10px 24px', background:'rgba(220, 38, 38, 0.08)', border:'1px solid rgba(220, 38, 38, 0.2)', borderRadius:10, color:'var(--clay)', cursor:'pointer', fontSize:14, fontWeight: '800' }}>✗ Reject</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 🟢 APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:32, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:24, color: 'var(--text-primary)' }}>Patient Appointment Requests</div>
            
            {appointments.length === 0 && <div style={{ fontSize:14, color:'var(--text-faint)', fontWeight: '600' }}>No appointments found.</div>}
            
            {appointments.map(a => (
              <div key={a.firestoreId || a.id} style={{ padding:'20px', background:'#f8fafc', border:'1px solid var(--border-soft)', borderRadius:12, marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <span style={{ fontSize:16, fontWeight:900, color: 'var(--text-primary)' }}>{a.patientName}</span>
                  <span style={{ fontSize:13, color:'var(--text-faint)', fontWeight: 'bold' }}>{a.timePreference}</span>
                </div>
                
                <div style={{ fontSize:14, color:'var(--text-muted)', marginBottom:6, fontWeight: '600' }}>
                  📞 {a.phone} &nbsp; | &nbsp; 💳 Aadhaar: {a.aadhaar || 'N/A'}
                </div>
                <div style={{ fontSize:14, color:'var(--cool)', marginBottom:12, fontWeight: '700' }}>
                  👨‍⚕️ Req: {a.doctorName} &nbsp; | &nbsp; <span style={{color: 'var(--sage)'}}>💰 Fee: ₹{a.fee || 500}</span>
                </div>
                
                <div style={{ fontSize:14, color:'var(--text-muted)', marginBottom:16, background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>💬 <strong>Notes:</strong> {a.symptoms}</div>
                
                {a.status === 'pending' && (
                  <div style={{ display:'flex', gap:12, alignItems: 'center' }}>
                    <select id={`time-${a.firestoreId}`} defaultValue={a.timePreference} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontWeight: '600' }}>
                      <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                      <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                      <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                    </select>
                    <button onClick={() => handleApproveAndSchedule(a.firestoreId)} style={{ padding:'10px 24px', background:'rgba(22, 163, 74, 0.1)', border:'1px solid rgba(22, 163, 74, 0.3)', borderRadius:10, color:'var(--sage)', cursor:'pointer', fontSize:14, fontWeight: '800' }}>✓ Confirm</button>
                    <button onClick={() => handleUpdateAppointment(a.firestoreId, 'rejected')} style={{ padding:'10px 24px', background:'rgba(220, 38, 38, 0.08)', border:'1px solid rgba(220, 38, 38, 0.2)', borderRadius:10, color:'var(--clay)', cursor:'pointer', fontSize:14, fontWeight: '800' }}>✗ Reject</button>
                  </div>
                )}
                
                {a.status === 'confirmed' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize:14, color: 'var(--sage)', fontWeight: '800' }}>● Confirmed for {a.timePreference}</div>
                    <button onClick={() => handleUpdateAppointment(a.firestoreId, 'completed')} style={{ padding:'8px 20px', background:'transparent', border:'2px solid var(--sage)', borderRadius:10, color:'var(--sage)', cursor:'pointer', fontSize:13, fontWeight: '800' }}>Mark Completed</button>
                  </div>
                )}
                
                {a.status === 'completed' && <div style={{ fontSize:14, color: 'var(--text-faint)', fontWeight: '800' }}>● Appointment Completed</div>}
                {a.status === 'rejected' && <div style={{ fontSize:14, color: 'var(--clay)', fontWeight: '800' }}>● Request Rejected</div>}
              </div>
            ))}
          </div>
        )}

        {/* 🟢 BLOOD BANK TAB */}
        {activeTab === 'bloodbank' && hospital && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:16, padding:32, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:24, color: 'var(--text-primary)' }}>Blood Bank Inventory — {hospital.name}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16 }}>
              {Object.entries(hospital.bloodBank || {}).map(([type, units]) => (
                <div key={type} style={{ padding:'24px 16px', background: units === 0 ? 'rgba(220,38,38,0.05)' : '#f8fafc', border:`1px solid ${units === 0 ? 'rgba(220,38,38,0.3)' : 'var(--border-soft)'}`, borderRadius:16, textAlign:'center' }}>
                  <div style={{ fontFamily:'Instrument Serif', fontSize:38, color: units === 0 ? 'var(--clay)' : units <= 3 ? '#d97706' : 'var(--sage)', marginBottom:4, fontWeight: 'bold' }}>{units}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', marginBottom:4 }}>{type}</div>
                  <div style={{ fontSize:12, color:'var(--text-faint)', fontWeight: '600' }}>UNITS</div>
                  {units === 0 && <div style={{ fontSize:11, color:'var(--clay)', marginTop:8, textTransform:'uppercase', letterSpacing:1, fontWeight: '800' }}>Out of Stock</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <UpdateModal
          label={modal.label}
          current={modal.available}
          total={modal.total}
          onClose={() => setModal(null)}
          onSave={(val) => handleSave(modal.type, modal.label, val)}
        />
      )}

      {/* 🟢 TRANSFER MODAL */}
      {transferModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 40, borderRadius: 24, width: 420, border: '1px solid var(--border-soft)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: 10, fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>Request Resource</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28, fontWeight: 500 }}>Ask another hospital in the network for supplies or beds.</p>
            
            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800 }}>Destination Hospital</label>
            <select value={transferForm.toHospitalId} onChange={e => setTransferForm(p => ({ ...p, toHospitalId: e.target.value }))} style={{ width: '100%', padding: '14px', marginBottom: 20, marginTop: 8, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)', outline: 'none', fontWeight: 600 }}>
              <option value="">-- Choose Hospital --</option>
              {hospitals.filter(h => (h.firestoreId || h.id) !== (hospital.firestoreId || hospital.id)).map(h => (
                <option key={h.firestoreId || h.id} value={h.firestoreId || h.id}>{h.name} ({h.location})</option>
              ))}
            </select>

            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800 }}>Resource Needed</label>
            <select value={transferForm.resource} onChange={e => setTransferForm(p => ({ ...p, resource: e.target.value }))} style={{ width: '100%', padding: '14px', marginBottom: 20, marginTop: 8, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)', outline: 'none', fontWeight: 600 }}>
              <option value="Blood (O+)">Blood (O+)</option>
              <option value="Blood (A-)">Blood (A-)</option>
              <option value="ICU Bed Transfer">ICU Bed Transfer</option>
              <option value="Ventilator">Ventilator</option>
              <option value="Ambulance Dispatch">Ambulance Dispatch</option>
            </select>

            <div style={{ display: 'flex', gap: 16, marginBottom: 30 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800 }}>Quantity</label>
                <input type="number" min="1" value={transferForm.qty} onChange={e => setTransferForm(p => ({ ...p, qty: e.target.value }))} style={{ width: '100%', padding: '14px', marginTop: 8, borderRadius: 12, background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)', outline: 'none', fontWeight: 600, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: '14px', background: transferForm.urgent ? 'rgba(220,38,38,0.1)' : 'var(--bg-base)', border: transferForm.urgent ? '2px solid rgba(220,38,38,0.4)' : '2px solid var(--border-soft)', borderRadius: 12, width: '100%', transition: 'all 0.2s', boxSizing: 'border-box' }}>
                  <input type="checkbox" checked={transferForm.urgent} onChange={e => setTransferForm(p => ({ ...p, urgent: e.target.checked }))} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: 14, color: transferForm.urgent ? 'var(--clay)' : 'var(--text-muted)', fontWeight: 800 }}>Urgent</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setTransferModal(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '2px solid var(--border-soft)', color: 'var(--text-primary)', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>Cancel</button>
              <button onClick={handleCreateTransfer} style={{ flex: 1, padding: '14px', background: 'var(--cool)', border: 'none', color: 'white', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}