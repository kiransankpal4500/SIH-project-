/**
 * React Application DOM Root
 * Mounts the OceanScope application into the browser DOM container.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './config/firebase';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA service worker for installability and offline caching
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service worker registration notice:', err);
    });
  });
}

