import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDKrvMrtwkFjJ2IKPwUsYoujB3WtjNpGg8",
  authDomain: "medisync-app-8af36.firebaseapp.com",
  projectId: "medisync-app-8af36",
  storageBucket: "medisync-app-8af36.firebasestorage.app",
  messagingSenderId: "273577841142",
  appId: "1:273577841142:web:d1067a17a312a2b68837d7",
  measurementId: "G-0CJ199262S"
}

// initialize Firebase
const app = initializeApp(firebaseConfig)

// these are what we import in other files
export const auth = getAuth(app)
export const db = getFirestore(app)