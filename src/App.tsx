import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// We temporarily remove AuthGuard for the hackathon so you don't get locked out while testing
// import AuthGuard from './components/shared/AuthGuard';
import DataUploadPanel from './components/dashboard/DataUploadPanel';

// 1. Import our real screens
const SOSScreen = lazy(() => import('./components/sos/SOSScreen'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));

// Mocks for later
const MockLogin = () => <div style={{ padding: '2rem' }}>Login View</div>;
const MockIncidentDetail = () => <div style={{ padding: '2rem' }}>Incident Detail</div>;
const MockAuditLog = () => <div style={{ padding: '2rem' }}>Audit Log</div>;

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: '2rem' }}>Loading Aegis Grid...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<MockLogin />} />
          <Route path="/sos" element={<SOSScreen />} />
          
          {/* 2. The Real Dashboard is now live! */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="/incident/:id" element={<MockIncidentDetail />} />
          <Route path="/upload" element={<DataUploadPanel />} />
          <Route path="/audit" element={<MockAuditLog />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}