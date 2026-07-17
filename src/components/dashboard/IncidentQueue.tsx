import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import '../../styles/riskPalette.css';

// 1. We add this interface so TypeScript knows exactly what data to expect
interface QueuedIncident {
  id: string;
  severity: number;
  timestampMs: number;
  reasoningTrace: string;
  status: string;
  ageSec: number;
  [key: string]: any; 
}

export default function IncidentQueue() {
  const [incidents, setIncidents] = useState<QueuedIncident[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen strictly for OPEN incidents
    const q = query(collection(db, 'incidents'), where('status', '==', 'open'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = snapshot.docs.map(doc => {
        const data = doc.data();
        const ageSec = Math.floor((Date.now() - data.timestampMs) / 1000);
        
        // 2. We explicitly cast the result as our new interface
        return { ...data, ageSec } as QueuedIncident;
      });

      // CORE REQUIREMENT: True Priority Queue Sort (O(n log n) render sort)
      liveData.sort((a, b) => {
        const scoreA = (a.severity * 100000) - a.ageSec;
        const scoreB = (b.severity * 100000) - b.ageSec;
        return scoreB - scoreA;
      });

      setIncidents(liveData);
    });

    return () => unsubscribe();
  }, []);

  const getRiskStyles = (severity: number) => {
    if (severity >= 5) return { class: 'risk-critical', text: 'Critical', icon: '🚨' };
    if (severity === 4) return { class: 'risk-high', text: 'High', icon: '⚠️' };
    if (severity === 3) return { class: 'risk-moderate', text: 'Moderate', icon: '👀' };
    return { class: 'risk-low', text: 'Low', icon: '✓' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      <h2 style={{ color: 'white', marginTop: 0, marginBottom: '0.5rem' }}>Active Triage Queue</h2>
      
      {incidents.length === 0 ? (
        <div style={{ background: '#1e1e1e', color: '#888', padding: '2rem', textAlign: 'center', borderRadius: '8px' }}>
          No active incidents at this time.
        </div>
      ) : (
        incidents.map((incident) => {
          const risk = getRiskStyles(incident.severity);
          
          return (
            <div 
              key={incident.id} 
              className={`animate-slide-up ${risk.class === 'risk-critical' ? 'pulse-border-critical' : risk.class === 'risk-high' ? 'pulse-border-high' : ''}`}
              style={{ background: '#1e1e1e', borderRadius: '8px', padding: '1.5rem', borderLeft: `6px solid ${risk.class === 'risk-critical' ? '#c62828' : risk.class === 'risk-high' ? '#ef6c00' : '#1565c0'}`, marginBottom: '1rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span className={`risk-badge ${risk.class}`}>
                  {risk.icon} Priority {incident.severity} - {risk.text}
                </span>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  {new Date(incident.timestampMs).toLocaleTimeString()}
                </span>
              </div>
              
              <div aria-live="polite" style={{ color: 'white', fontSize: '1.05rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                {incident.reasoningTrace}
              </div>

              <button 
                onClick={() => navigate(`/incident/${incident.id}`)}
                style={{ width: '100%', background: '#333', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#444'}
                onMouseOut={(e) => e.currentTarget.style.background = '#333'}
              >
                Review & Dispatch Responder &rarr;
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}