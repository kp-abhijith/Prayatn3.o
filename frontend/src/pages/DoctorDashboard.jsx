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
      
      // show if this hospital sent it or is receiving it
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

  // const calculateTotals = () => {
  //   console.log("old method to calc totals");
  // }

  const handleSave = async (type, itemLabel, newValue) => {
    if (!hospital) return
    console.log("saving resource:", itemLabel, newValue)

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

  // submit new transfer
  const handleCreateTransfer = async () => {
    if (!transferForm.toHospitalId) return alert("Please select a destination hospital");
    
    // console.log("sending transfer req to", transferForm.toHospitalId)

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

  // approve or reject transfer
  const handleUpdateTransfer = async (transferId, newStatus) => {
    try { await updateDoc(doc(db, 'transfers', transferId), { status: newStatus }); } 
    catch (err) { console.error("Update transfer error:", err); }
  };

  // delete/cancel a transfer
  const handleDeleteTransfer = async (transferId) => {
    if (window.confirm("Are you sure you want to delete this transfer request?")) {
      try { 
        await deleteDoc(doc(db, 'transfers', transferId)); 
      } catch (err) { 
        console.error("Delete transfer error:", err); 
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#f5f1e7', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:'Instrument Serif', fontSize:24, color:'#7a7671' }}>Loading hospitals...</div>
    </div>
  )

  return (
    <div style={{ 
      '--bg-base': '#f5f1e7', 
      '--bg-surface': '#ffffff', 
      '--border-soft': '#e8e3d8', 
      '--cool': '#8c7362', 
      '--sage': '#6d8a70', 
      '--warm': '#d49679', 
      '--clay': '#c26d6d',
      '--text-muted': '#7a7671',
      '--text-faint': '#a39f9a',
      '--text-primary': '#363431',
      minHeight:'100vh', background:'var(--bg-base)', color:'var(--text-primary)', display:'flex', fontFamily: 'IBM Plex Sans, sans-serif' 
    }}>

      {/* sidebar */}
      <div style={{ width:220, background:'var(--bg-surface)', borderRight:'1px solid var(--border-soft)', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 }}>
        <div style={{ padding:'0 20px 24px', borderBottom:'1px solid var(--border-soft)' }}>
          <div style={{ fontSize:20, fontFamily:'Instrument Serif', color: 'var(--cool)', fontWeight: 'bold' }}>MediSync</div>
          <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Doctor Dashboard</div>
        </div>

        <div style={{ padding:'16px 12px', borderBottom:'1px solid var(--border-soft)' }}>
          <div style={{ fontSize:10, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, paddingLeft:8 }}>Your Hospital</div>
          {hospitals.map((h, i) => (
            <button key={h.id || h.firestoreId} onClick={() => setActiveHospital(i)} style={{ width:'100%', padding:'8px 10px', background: i === activeHospital ? 'rgba(140, 115, 98, 0.1)' : 'transparent', border: i === activeHospital ? '1px solid rgba(140, 115, 98, 0.2)' : '1px solid transparent', borderRadius:8, cursor:'pointer', textAlign:'left', marginBottom:4 }}>
              <div style={{ fontSize:12, fontWeight:600, color: i === activeHospital ? 'var(--cool)' : 'var(--text-primary)' }}>{h.name}</div>
              <div style={{ fontSize:10, color:'var(--text-faint)' }}>{h.location}</div>
            </button>
          ))}
        </div>

        <div style={{ padding:'12px 12px', flex:1 }}>
          {tabs.map(tab => {
            // dynamic badge for incoming transfers
            const pendingIncoming = transfers.filter(t => t.toId === (hospital.firestoreId || hospital.id) && t.status === 'pending').length;
            
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ width:'100%', padding:'9px 10px', background: activeTab === tab.id ? 'rgba(140, 115, 98, 0.08)' : 'transparent', border:'none', borderRadius:8, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span style={{ fontSize:15 }}>{tab.icon}</span>
                <span style={{ fontSize:13, color: activeTab === tab.id ? 'var(--cool)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 600 : 400 }}>{tab.label}</span>
                {tab.id === 'transfers' && pendingIncoming > 0 && (
                  <span style={{ marginLeft:'auto', background:'var(--clay)', color:'#fff', fontSize:10, padding:'1px 6px', borderRadius:99 }}>{pendingIncoming}</span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ padding:'16px 12px', borderTop:'1px solid var(--border-soft)' }}>
          <button onClick={handleSignOut} style={{ width:'100%', padding:'9px 10px', background:'transparent', border:'1px solid var(--border-soft)', borderRadius:8, cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>← Sign Out</button>
        </div>
      </div>

      {/* main content */}
      <div style={{ flex:1, padding:'32px 36px', overflowY:'auto' }}>

        <div style={{ marginBottom:28 }}>
          <h2 style={{ fontSize:28, marginBottom:4, fontFamily: 'Instrument Serif' }}>{hospital?.name}</h2>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>{hospital?.location}</span>
            <span style={{ fontSize:11, padding:'3px 10px', background: hospital?.status === 'critical' ? 'rgba(194,109,109,0.15)' : 'rgba(109,138,112,0.15)', color: hospital?.status === 'critical' ? 'var(--clay)' : 'var(--sage)', border:`1px solid ${hospital?.status === 'critical' ? 'rgba(194,109,109,0.3)' : 'rgba(109,138,112,0.3)'}`, borderRadius:99 }}>
              {hospital?.status === 'critical' ? '⚠️ Critical' : '✅ Normal'}
            </span>
          </div>
        </div>

        {/* overview tab */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display:'flex', gap:16, marginBottom:28, flexWrap:'wrap' }}>
              {[
                { icon:'🛏️', label:'ICU Beds Available', value:totalICU,      sub:'across all hospitals', color:'var(--cool)' },
                { icon:'🏥', label:'General Beds',       value:totalBeds,     sub:'across all hospitals', color:'var(--sage)' },
                { icon:'🚑', label:'Ambulances Ready',   value:totalAmb,      sub:'across all hospitals', color:'var(--warm)' },
                { icon:'🔴', label:'Critical Alerts',    value:criticalCount, sub:'need attention now',   color:'var(--clay)' },
              ].map(card => (
                <div key={card.label} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:'20px 22px', flex:1, minWidth:160, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                    <div style={{ width:34, height:34, background:`${card.color}18`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{card.icon}</div>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{card.label}</span>
                  </div>
                  <div style={{ fontFamily:'Instrument Serif', fontSize:32, color:card.color, lineHeight:1 }}>{card.value}</div>
                  <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:6 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
                  <span>Live Alerts</span>
                  <span style={{ fontSize:11, color:'var(--text-faint)' }}>{alerts.length} active</span>
                </div>
                {alerts.length === 0 && <div style={{ fontSize:13, color:'var(--text-faint)', textAlign:'center', padding:20 }}>No active alerts</div>}
                {alerts.map(a => (
                  <AlertItem key={a.id} {...a} onDismiss={() => setAlerts(prev => prev.filter(x => x.id !== a.id))} />
                ))}
              </div>

              <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Recent Transfers</div>
                {transfers.slice(0, 4).map(t => {
                  const isIncoming = t.toId === (hospital.firestoreId || hospital.id);
                  return (
                    <div key={t.id} style={{ padding:'12px 14px', background:'rgba(0,0,0,0.02)', border:'1px solid var(--border-soft)', borderRadius:10, marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:600 }}>{t.resource} <span style={{color:'var(--cool)'}}>× {t.qty}</span></span>
                        {t.urgent && <span style={{ fontSize:9, color:'var(--clay)', border:'1px solid rgba(194,109,109,0.3)', padding:'2px 7px', borderRadius:99, textTransform:'uppercase' }}>Urgent</span>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-muted)'}}>
                        {isIncoming ? `📥 From: ${t.fromName}` : `📤 To: ${t.toName}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* resources tab */}
        {activeTab === 'resources' && hospital && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Beds & Ambulances</div>
              {[
                { icon:'🛏️', label:'ICU Beds',     available:hospital.icuBeds?.available,     total:hospital.icuBeds?.total     },
                { icon:'🛏️', label:'General Beds', available:hospital.generalBeds?.available, total:hospital.generalBeds?.total },
                { icon:'🚑', label:'Ambulances',   available:hospital.ambulances?.available,  total:hospital.ambulances?.total  },
              ].map(item => (
                <ResourceBar key={item.label} {...item} onUpdate={(label, available, total) => setModal({ label, available, total, type:'beds' })} />
              ))}
            </div>

            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Doctors On Duty</div>
              {Object.entries(hospital.doctors || {}).map(([name, data]) => (
                <ResourceBar key={name} icon={data.icon} label={name} available={data.available} total={data.total} onUpdate={(label, available, total) => setModal({ label, available, total, type:'doctors' })} />
              ))}
            </div>

            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:20, gridColumn:'span 2', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Equipment</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {Object.entries(hospital.equipment || {}).map(([name, data]) => (
                  <ResourceBar key={name} icon={data.icon} label={name} available={data.available} total={data.total} onUpdate={(label, available, total) => setModal({ label, available, total, type:'equipment' })} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* real-time transfers tab */}
        {activeTab === 'transfers' && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:24, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:600 }}>B2B Resource Transfers</div>
              <button onClick={() => setTransferModal(true)} style={{ padding:'8px 16px', background:'var(--cool)', color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:13 }}>
                + Request Resource
              </button>
            </div>

            {transfers.length === 0 && <div style={{ fontSize:13, color:'var(--text-faint)', textAlign:'center', padding:20 }}>No active transfer requests.</div>}
            
            {transfers.map(t => {
              const isIncoming = t.toId === (hospital.firestoreId || hospital.id);
              
              return (
                <div key={t.id} style={{ padding:'14px 16px', background:'rgba(0,0,0,0.02)', border:'1px solid var(--border-soft)', borderRadius:10, marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:14, fontWeight:600 }}>{t.resource} <span style={{color:'var(--cool)'}}>× {t.qty}</span></span>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      {t.urgent && <span style={{ fontSize:9, color:'var(--clay)', border:'1px solid rgba(194,109,109,0.3)', padding:'2px 7px', borderRadius:99, textTransform:'uppercase' }}>Urgent</span>}
                      <span style={{ fontSize:11, color: t.status === 'pending' ? 'var(--warm)' : t.status === 'approved' ? 'var(--sage)' : 'var(--text-muted)', padding:'3px 10px', background:'rgba(0,0,0,0.04)', borderRadius:99, textTransform:'uppercase' }}>{t.status}</span>
                      
                      {/* delete button */}
                      <button 
                        onClick={() => handleDeleteTransfer(t.id)} 
                        style={{ background:'transparent', border:'none', color:'var(--text-faint)', cursor:'pointer', padding:'2px 4px', fontSize:14, marginLeft:4, transition: '0.2s' }} 
                        title="Delete Request"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:10 }}>
                    {isIncoming ? `📥 From: ${t.fromName}` : `📤 To: ${t.toName}`} · {t.time || 'Just now'}
                  </div>
                  
                  {isIncoming && t.status === 'pending' && (
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => handleUpdateTransfer(t.id, 'approved')} style={{ padding:'8px 20px', background:'rgba(109,138,112,0.1)', border:'1px solid rgba(109,138,112,0.3)', borderRadius:8, color:'var(--sage)', cursor:'pointer', fontSize:13 }}>✓ Approve</button>
                      <button onClick={() => handleUpdateTransfer(t.id, 'rejected')} style={{ padding:'8px 20px', background:'rgba(194,109,109,0.08)', border:'1px solid rgba(194,109,109,0.2)', borderRadius:8, color:'var(--clay)', cursor:'pointer', fontSize:13 }}>✗ Reject</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* appointments */}
        {activeTab === 'appointments' && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:24, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Patient Appointment Requests</div>
            
            {appointments.length === 0 && <div style={{ fontSize:13, color:'var(--text-faint)' }}>No appointments found for this hospital.</div>}
            
            {appointments.map(a => (
              <div key={a.firestoreId || a.id} style={{ padding:'14px 16px', background:'rgba(0,0,0,0.02)', border:'1px solid var(--border-soft)', borderRadius:10, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:14, fontWeight:600 }}>{a.patientName}</span>
                  <span style={{ fontSize:11, color:'var(--text-faint)' }}>{a.timePreference}</span>
                </div>
                
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:4 }}>
                  📞 {a.phone} &nbsp; | &nbsp; 💳 Aadhaar: {a.aadhaar || 'N/A'}
                </div>
                <div style={{ fontSize:13, color:'var(--cool)', marginBottom:8 }}>
                  👨‍⚕️ Requested: {a.doctorName} &nbsp; | &nbsp; <span style={{color: 'var(--sage)'}}>💰 Fee: ₹{a.fee || 500}</span>
                </div>
                
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>💬 {a.symptoms}</div>
                
                {a.status === 'pending' && (
                  <div style={{ display:'flex', gap:8, alignItems: 'center' }}>
                    <select id={`time-${a.firestoreId}`} defaultValue={a.timePreference} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}>
                      <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                      <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                      <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                    </select>
                    <button onClick={() => handleApproveAndSchedule(a.firestoreId)} style={{ padding:'8px 20px', background:'rgba(109,138,112,0.1)', border:'1px solid rgba(109,138,112,0.3)', borderRadius:8, color:'var(--sage)', cursor:'pointer', fontSize:13 }}>✓ Confirm</button>
                    <button onClick={() => handleUpdateAppointment(a.firestoreId, 'rejected')} style={{ padding:'8px 20px', background:'rgba(194,109,109,0.08)', border:'1px solid rgba(194,109,109,0.2)', borderRadius:8, color:'var(--clay)', cursor:'pointer', fontSize:13 }}>✗ Reject</button>
                  </div>
                )}
                
                {a.status === 'confirmed' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize:13, color: 'var(--sage)' }}>● Confirmed for {a.timePreference}</div>
                    <button onClick={() => handleUpdateAppointment(a.firestoreId, 'completed')} style={{ padding:'6px 16px', background:'transparent', border:'1px solid var(--sage)', borderRadius:8, color:'var(--sage)', cursor:'pointer', fontSize:12 }}>Mark Completed</button>
                  </div>
                )}
                
                {a.status === 'completed' && <div style={{ fontSize:13, color: 'var(--text-faint)' }}>● Completed</div>}
                {a.status === 'rejected' && <div style={{ fontSize:13, color: 'var(--clay)' }}>● Rejected</div>}
              </div>
            ))}
          </div>
        )}

        {/* blood bank */}
        {activeTab === 'bloodbank' && hospital && (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-soft)', borderRadius:14, padding:24, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Blood Bank — {hospital.name}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
              {Object.entries(hospital.bloodBank || {}).map(([type, units]) => (
                <div key={type} style={{ padding:'18px 14px', background: units === 0 ? 'rgba(194,109,109,0.08)' : 'rgba(0,0,0,0.02)', border:`1px solid ${units === 0 ? 'rgba(194,109,109,0.25)' : 'var(--border-soft)'}`, borderRadius:12, textAlign:'center' }}>
                  <div style={{ fontFamily:'Instrument Serif', fontSize:28, color: units === 0 ? 'var(--clay)' : units <= 3 ? 'var(--warm)' : 'var(--sage)', marginBottom:4 }}>{units}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{type}</div>
                  <div style={{ fontSize:11, color:'var(--text-faint)' }}>units</div>
                  {units === 0 && <div style={{ fontSize:10, color:'var(--clay)', marginTop:6, textTransform:'uppercase', letterSpacing:0.5 }}>Out of Stock</div>}
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

      {/* glassmorphism transfer modal */}
      {transferModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(50, 45, 40, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 32, borderRadius: 16, width: 380, border: '1px solid var(--border-soft)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: 16, fontSize: 20 }}>Request Resource</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Ask another hospital in the network for supplies or beds.</p>
            
            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Destination Hospital</label>
            <select value={transferForm.toHospitalId} onChange={e => setTransferForm(p => ({ ...p, toHospitalId: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginBottom: 16, marginTop: 6, borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)', outline: 'none' }}>
              <option value="">-- Choose Hospital --</option>
              {hospitals.filter(h => (h.firestoreId || h.id) !== (hospital.firestoreId || hospital.id)).map(h => (
                <option key={h.firestoreId || h.id} value={h.firestoreId || h.id}>{h.name} ({h.location})</option>
              ))}
            </select>

            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Resource Needed</label>
            <select value={transferForm.resource} onChange={e => setTransferForm(p => ({ ...p, resource: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginBottom: 16, marginTop: 6, borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)', outline: 'none' }}>
              <option value="Blood (O+)">Blood (O+)</option>
              <option value="Blood (A-)">Blood (A-)</option>
              <option value="ICU Bed Transfer">ICU Bed Transfer</option>
              <option value="Ventilator">Ventilator</option>
              <option value="Ambulance Dispatch">Ambulance Dispatch</option>
            </select>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Quantity</label>
                <input type="number" min="1" value={transferForm.qty} onChange={e => setTransferForm(p => ({ ...p, qty: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)', outline: 'none' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: '10px', background: transferForm.urgent ? 'rgba(194,109,109,0.1)' : 'var(--bg-base)', border: transferForm.urgent ? '1px solid rgba(194,109,109,0.3)' : '1px solid var(--border-soft)', borderRadius: 8, width: '100%', transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={transferForm.urgent} onChange={e => setTransferForm(p => ({ ...p, urgent: e.target.checked }))} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: transferForm.urgent ? 'var(--clay)' : 'var(--text-muted)' }}>Urgent</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setTransferModal(false)} style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleCreateTransfer} style={{ flex: 1, padding: 10, background: 'var(--cool)', border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}