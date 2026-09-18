/**
 * Firebase Client Configuration & Analytics
 * Integrates Firebase for OceanScope hosting, telemetry, and analytics.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyA9Vvxk-vMz-BR8_8ukwLkPNhls8BiEFao",
  authDomain: "oceanscope-b3b88.firebaseapp.com",
  projectId: "oceanscope-b3b88",
  storageBucket: "oceanscope-b3b88.firebasestorage.app",
  messagingSenderId: "1067253343102",
  appId: "1:1067253343102:web:416916b90a096c2e7ec92f",
  measurementId: "G-5K7TRRLR6X"
};

// Initialize Firebase App
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

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
