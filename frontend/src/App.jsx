// App.jsx — routing only, nothing else lives here
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage       from './pages/LoginPage'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientPortal   from './pages/PatientPortal'
import PatientDashboard from './pages/PatientDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                 element={<LoginPage />} />
        <Route path="/dashboard"        element={<DoctorDashboard />} />
        
        {/* 🟢 TERA NAYA DOCTOR ROUTE */}
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} /> 

        {/* The Booking Page */}
        <Route path="/patient"          element={<PatientPortal />} /> 
        
        {/* The Live Token Tracker */}
        <Route path="/patient-dashboard" element={<PatientDashboard />} /> 
      </Routes>
    </BrowserRouter>
  )
}