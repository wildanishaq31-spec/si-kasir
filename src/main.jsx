import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import { initTouchProtection } from './utils/touchProtection';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

// Matikan pull-to-refresh dan swipe navigasi kanan/kiri di HP
initTouchProtection();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

