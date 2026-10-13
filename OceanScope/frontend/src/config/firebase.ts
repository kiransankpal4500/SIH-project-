/**
 * Firebase Client Configuration & Analytics
 * Integrates Firebase for OceanScope hosting, telemetry, and analytics.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyATUmT1IvdqpN3d3kbqVInUUopoDS4GJsw",
  authDomain: "oceanscope-d6305.firebaseapp.com",
  projectId: "oceanscope-d6305",
  storageBucket: "oceanscope-d6305.firebasestorage.app",
  messagingSenderId: "544695904804",
  appId: "1:544695904804:web:340b112dad5173af4686b1",
  measurementId: "G-6290YB1F8H"
};

// Initialize Firebase App
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(firebaseApp);

// Configure Google Auth Provider
export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Cloud Firestore Database
export const db: Firestore = getFirestore(firebaseApp);

// Initialize Analytics conditionally when running in supported browser environments
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(firebaseApp);
      }
    })
    .catch(() => {
      // Non-blocking in headless/testing environments
    });
}
