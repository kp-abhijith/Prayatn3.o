// App.jsx — routing only, nothing else lives here
// three routes, three pages, that's it
// Day 2: wrap /dashboard in a ProtectedRoute that checks Firebase Auth

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage       from './pages/LoginPage'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientPortal   from './pages/PatientPortal'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<LoginPage />}       />
        <Route path="/dashboard" element={<DoctorDashboard />} />
        <Route path="/patient"   element={<PatientPortal />}   />
      </Routes>
    </BrowserRouter>
  )
}
