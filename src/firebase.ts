import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = { 
  apiKey: "AIzaSyBHhgW0CN82Wpi95P3jWCyLqI1mZmw-EPk", 
  authDomain: "jsonstorage-viewer-ux.firebaseapp.com", 
  projectId: "jsonstorage-viewer-ux", 
  storageBucket: "jsonstorage-viewer-ux.firebasestorage.app", 
  messagingSenderId: "144517668789", 
  appId: "1:144517668789:web:1c8856959e8f2b075343fc", 
  measurementId: "G-G2QBYVLXSK" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;