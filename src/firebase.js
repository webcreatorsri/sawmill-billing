// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxyLMpSaL1VU1h1T0Y3k5NhbYqbLDiQBI",
  authDomain: "sawmill-d40e1.firebaseapp.com",
  projectId: "sawmill-d40e1",
  storageBucket: "sawmill-d40e1.firebasestorage.app",
  messagingSenderId: "21956895449",
  appId: "1:21956895449:web:af662a8f4e76509f2514c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Firebase offline persistence enabled");
  })
  .catch((err) => {
    console.warn("Firebase offline persistence failed:", err);
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser doesn\'t support persistence.');
    }
  });

// Export individual functions as needed
export { 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from "firebase/auth";

export { 
  doc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction, 
  serverTimestamp 
} from "firebase/firestore";