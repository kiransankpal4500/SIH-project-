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
