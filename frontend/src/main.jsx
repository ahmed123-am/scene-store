import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const Admin = lazy(() => import('./admin/Admin.jsx'));
const isAdmin = window.location.pathname.replace(/\/$/, '') === '/admin';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <Suspense fallback={<p role="status">بنفتح مساحة الإدارة…</p>}><Admin /></Suspense> : <App />}
  </React.StrictMode>,
);
