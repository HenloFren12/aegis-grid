import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Eagerly loaded components (Primary staff surface)
import AuthGuard from './components/shared/AuthGuard';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import DataUploadPanel from './components/dashboard/DataUploadPanel';
import IncidentDetail from './components/dashboard/IncidentDetail';

// Lazy loaded components (Code-split for performance)
const SOSScreen = lazy(() => import('./components/sos/SOSScreen'));
const AuditLog = lazy(() => import('./components/dashboard/AuditLog'));

export default function App() {
  return (
    <Router>
      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212', color: 'white' }}>
          Loading Aegis Grid...
        </div>
      }>
        <Routes>
          {/* PUBLIC ROUTES (No login required) */}
          <Route path="/login" element={<Login />} />
          <Route path="/sos" element={<SOSScreen />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* PROTECTED STAFF ROUTES (AuthGuard enforced) */}
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/incident/:id" element={<IncidentDetail />} />
            <Route path="/upload" element={<DataUploadPanel />} />
            <Route path="/audit" element={<AuditLog />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}