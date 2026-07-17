import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import VenueMap from './VenueMap';
import IncidentQueue from './IncidentQueue';
import GateRiskCard from './GateRiskCard';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [gates, setGates] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Stream live gate telemetry for the Foresight Engine
    const unsubscribeGates = onSnapshot(collection(db, 'gates'), (snap) => {
      setGates(snap.docs.map(d => d.data()));
    });
    
    // Stream active incidents to drop markers on the VenueMap
    const q = query(collection(db, 'incidents'), where('status', '==', 'open'));
    const unsubscribeIncidents = onSnapshot(q, (snap) => {
      setIncidents(snap.docs.map(d => d.data()));
    });
    
    return () => { 
      unsubscribeGates(); 
      unsubscribeIncidents(); 
    };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '1.5rem', padding: '1.5rem', height: '100vh', backgroundColor: '#121212', color: 'white', fontFamily: 'system-ui', boxSizing: 'border-box' }}>
      
      {/* LEFT COLUMN: Map & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 3rem)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Aegis Command Center</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => navigate('/upload')} style={{ background: '#333', color: 'white', padding: '0.5rem 1rem', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer' }}>
              Data Ingestion
            </button>
            <button onClick={() => window.open('/sos', '_blank')} style={{ background: '#d32f2f', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Test SOS Report
            </button>
          </div>
        </div>
        
        <div style={{ flexGrow: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
          <VenueMap incidents={incidents} />
        </div>
      </div>

      {/* RIGHT COLUMN: AI Analysis Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 3rem)', overflow: 'hidden' }}>
        
        {/* Gate Risk Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '45%' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#aaa' }}>Gate Risk Foresight</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {gates.length === 0 ? (
              <p style={{ color: '#666', background: '#1e1e1e', padding: '1rem', borderRadius: '4px' }}>Awaiting sensor telemetry...</p>
            ) : (
              gates.map(g => <GateRiskCard key={g.gateId} gate={g} />)
            )}
          </div>
        </div>

        {/* Fusion Queue Section */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
          <IncidentQueue />
        </div>

      </div>
    </div>
  );
}