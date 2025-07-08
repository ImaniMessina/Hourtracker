// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace the values below with your actual Firebase project config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBog-xJKMmNZu9iiV-4RHxuz8Ju43NwLtk",
  authDomain: "test-3cf90.firebaseapp.com",
  projectId: "test-3cf90",
  storageBucket: "test-3cf90.appspot.com", // <-- this is the correct value
  messagingSenderId: "154670256572",
  appId: "1:154670256572:web:fe546736151d879bcb1bb9",
  measurementId: "G-QYSDX52LYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 