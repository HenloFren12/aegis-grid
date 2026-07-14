import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/shared/AuthGuard';
import DataUploadPanel from './components/dashboard/DataUploadPanel';

// Temporary mock components. We will swap these to lazy() imports 
// exactly as the MD requests once we actually create the files in Phase 3!
const MockLogin = () => <div style={{ padding: '2rem' }}>Login View</div>;
const MockDashboard = () => <div style={{ padding: '2rem' }}>Dashboard View</div>;
const MockIncidentDetail = () => <div style={{ padding: '2rem' }}>Incident Detail</div>;
const MockAuditLog = () => <div style={{ padding: '2rem' }}>Audit Log</div>;
const MockSOSScreen = () => <div style={{ padding: '2rem' }}>SOS Screen</div>;

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div role="status" aria-live="polite">Loading Aegis Grid...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<MockLogin />} />
          <Route path="/sos" element={<MockSOSScreen />} />
          <Route path="/dashboard" element={<AuthGuard><MockDashboard /></AuthGuard>} />
          <Route path="/incident/:id" element={<AuthGuard><MockIncidentDetail /></AuthGuard>} />
          <Route path="/upload" element={<AuthGuard><DataUploadPanel /></AuthGuard>} />
          <Route path="/audit" element={<AuthGuard><MockAuditLog /></AuthGuard>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}