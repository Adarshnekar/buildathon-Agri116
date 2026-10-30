// Firebase configuration for Smart Polyhouse
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA0v6MgduPFUY1wOdDmvXkklP8ocWVnreE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-polyhouse-dc97b.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    "https://smart-polyhouse-dc97b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smart-polyhouse-dc97b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-polyhouse-dc97b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1001801846441",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1001801846441:web:19cf298455d8edd61a23b8",
};

// Prevent re-initialisation during hot-module reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getDatabase(app);
export const storage = getStorage(app);
