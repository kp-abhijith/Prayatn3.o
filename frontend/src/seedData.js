// run this ONCE to push mock data to Firestore
// after running, delete this file or comment it out
// Day 2: this replaces mockData.js

import { db } from './firebase'
import { doc, setDoc } from 'firebase/firestore'
import { HOSPITALS } from './data/mockData'

export const seedFirestore = async () => {
  for (const hospital of HOSPITALS) {
    await setDoc(doc(db, 'hospitals', String(hospital.id)), hospital)
    console.log(`✅ Seeded: ${hospital.name}`)
  }
  console.log('🎉 All hospitals seeded!')
}