import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AuthGuard from './components/shared/AuthGuard';
import Login from './components/auth/Login';

const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const IncidentDetail = lazy(() => import('./components/dashboard/IncidentDetail'));
const DataUploadPanel = lazy(() => import('./components/dashboard/DataUploadPanel'));
const AuditLog = lazy(() => import('./components/dashboard/AuditLog'));
const SOSScreen = lazy(() => import('./components/sos/SOSScreen'));

export default function App() {
  return (
    <Router>
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#121212',
              color: 'white',
            }}
          >
            Loading Aegis Grid...
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sos" element={<SOSScreen />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />

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