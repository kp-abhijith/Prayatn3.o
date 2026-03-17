// mockData.js — all fake data for the whole app
// Day 2: every export gets replaced by a Firebase read
// keep the same shape so swapping is easy

export const HOSPITALS = [
  {
    id: 1,
    name: "Medanta Indore",
    location: "vijay Nagar",
    status: "critical",

    // ICU nearly full — triggers red status
    icuBeds:     { total: 40,  available: 6  },
    generalBeds: { total: 200, available: 34 },
    ambulances:  { total: 12,  available: 3  },

    doctors: {
      Cardiologist:      { total: 5,  available: 2, icon: "🫀" },
      Neurologist:       { total: 3,  available: 0, icon: "🧠" }, // zero — auto alert
      Orthopedic:        { total: 6,  available: 4, icon: "🦴" },
      "General Surgeon": { total: 8,  available: 1, icon: "🔬" },
      Emergency:         { total: 10, available: 5, icon: "🚨" },
      Radiologist:       { total: 4,  available: 3, icon: "📡" },
    },

    equipment: {
      Ventilators:   { total: 30, available: 4, icon: "💨" },
      "CT Scan":     { total: 2,  available: 0, icon: "🔭" }, // offline
      "MRI Machine": { total: 1,  available: 1, icon: "🧲" },
      Dialysis:      { total: 8,  available: 3, icon: "💧" },
      Defibrillator: { total: 10, available: 7, icon: "⚡" },
      "X-Ray":       { total: 5,  available: 4, icon: "📸" },
    },

    bloodBank: {
      "A+": 12, "A-": 3,
      "B+": 8,  "B-": 1,
      "O+": 2,  "O-": 0,  // completely out
      "AB+": 5, "AB-": 2,
    },
  },

  {
    id: 2,
    name: "MY Hospital",
    location: "Regal Square",
    status: "normal",

    icuBeds:     { total: 25,  available: 14 },
    generalBeds: { total: 150, available: 80 },
    ambulances:  { total: 8,   available: 5  },

    doctors: {
      Cardiologist:      { total: 4, available: 3, icon: "🫀" },
      Neurologist:       { total: 2, available: 1, icon: "🧠" },
      Orthopedic:        { total: 5, available: 4, icon: "🦴" },
      "General Surgeon": { total: 6, available: 3, icon: "🔬" },
      Emergency:         { total: 8, available: 6, icon: "🚨" },
      Radiologist:       { total: 3, available: 2, icon: "📡" },
    },

    equipment: {
      Ventilators:   { total: 18, available: 9,  icon: "💨" },
      "CT Scan":     { total: 2,  available: 1,  icon: "🔭" },
      "MRI Machine": { total: 2,  available: 2,  icon: "🧲" },
      Dialysis:      { total: 6,  available: 4,  icon: "💧" },
      Defibrillator: { total: 8,  available: 6,  icon: "⚡" },
      "X-Ray":       { total: 4,  available: 3,  icon: "📸" },
    },

    bloodBank: {
      "A+": 8,  "A-": 5,
      "B+": 12, "B-": 3,
      "O+": 6,  "O-": 2,
      "AB+": 4, "AB-": 1,
    },
  },

  {
    id: 3,
    name: "Choithram Hospital",
    location: "MANIK Bagh",
    status: "normal",

    icuBeds:     { total: 35,  available: 22 },
    generalBeds: { total: 180, available: 95 },
    ambulances:  { total: 10,  available: 7  },

    doctors: {
      Cardiologist:      { total: 6,  available: 4, icon: "🫀" },
      Neurologist:       { total: 3,  available: 2, icon: "🧠" },
      Orthopedic:        { total: 4,  available: 3, icon: "🦴" },
      "General Surgeon": { total: 7,  available: 5, icon: "🔬" },
      Emergency:         { total: 12, available: 8, icon: "🚨" },
      Radiologist:       { total: 4,  available: 3, icon: "📡" },
    },

    equipment: {
      Ventilators:   { total: 22, available: 14, icon: "💨" },
      "CT Scan":     { total: 3,  available: 2,  icon: "🔭" },
      "MRI Machine": { total: 2,  available: 1,  icon: "🧲" },
      Dialysis:      { total: 10, available: 7,  icon: "💧" },
      Defibrillator: { total: 9,  available: 7,  icon: "⚡" },
      "X-Ray":       { total: 5,  available: 5,  icon: "📸" },
    },

    bloodBank: {
      "A+": 15, "A-": 4,
      "B+": 10, "B-": 2,
      "O+": 8,  "O-": 3,
      "AB+": 6, "AB-": 2,
    },
  },
]

// dismissable alerts shown on doctor dashboard
export const ALERTS = [
  { id: 1, msg: "Neurologist at AIIMS Delhi — 0 available. Auto-flagged.", level: "critical", time: "just now"   },
  { id: 2, msg: "O- blood completely out at AIIMS Delhi.",                  level: "critical", time: "4 min ago"  },
  { id: 3, msg: "CT Scan offline at AIIMS. Maintenance ETA: 3 hrs.",        level: "warning",  time: "11 min ago" },
  { id: 4, msg: "ICU hitting 85% capacity at AIIMS Delhi.",                 level: "warning",  time: "19 min ago" },
  { id: 5, msg: "Ambulance #7 back at base from Fortis transfer.",          level: "success",  time: "23 min ago" },
]

// hospital-to-hospital resource requests
export const TRANSFER_REQUESTS = [
  { id: 1, from: "Safdarjung Hospital", resource: "Ventilator",  qty: 3, status: "incoming", urgent: true,  time: "4 min ago" },
  { id: 2, from: "Max Hospital",        resource: "Neurologist", qty: 1, status: "incoming", urgent: true,  time: "9 min ago" },
  { id: 3, to:   "Fortis Hospital",     resource: "ICU Bed",     qty: 2, status: "sent",     urgent: false, time: "1 hr ago"  },
]

// registered community blood donors
export const DONORS = [
  { id: 1, name: "Rahul Sharma", blood: "O-",  city: "New Delhi", phone: "98xx-xxxx" },
  { id: 2, name: "Priya Singh",  blood: "O+",  city: "New Delhi", phone: "97xx-xxxx" },
  { id: 3, name: "Amit Kumar",   blood: "AB+", city: "Noida",     phone: "96xx-xxxx" },
  { id: 4, name: "Neha Gupta",   blood: "B-",  city: "Gurugram",  phone: "95xx-xxxx" },
  { id: 5, name: "Vikram Patel", blood: "A+",  city: "New Delhi", phone: "94xx-xxxx" },
]

// patient appointment requests — doctor sees these in Requests tab
export const APPOINTMENT_REQUESTS = [
  { id: 1, patient: "Suresh Mehta", phone: "91xx-xxxx", time: "Morning", symptoms: "chest tightness since 2 days", status: "pending" },
  { id: 2, patient: "Anita Bose",   phone: "90xx-xxxx", time: "Evening", symptoms: "recurring headaches",          status: "pending" },
]
