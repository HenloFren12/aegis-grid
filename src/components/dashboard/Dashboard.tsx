import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Incident {
  id: string;
  severity: number;
  reasoningTrace: string;
  status: string;
  timestampMs: number;
  centroid: { lat: number; lng: number };
}

// Default center (using the demo staff coordinates)
const MAP_CENTER = [40.7128, -74.0060] as [number, number];

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('timestampMs', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeIncidents = snapshot.docs.map(doc => doc.data() as Incident);
      setIncidents(activeIncidents);
    });
    return () => unsubscribe();
  }, []);

  const handleStaffReport = async () => {
    setIsSubmitting(true);
    try {
      const reportsRef = collection(db, 'reports');
      const newReportDoc = doc(reportsRef);

      await setDoc(newReportDoc, {
        id: newReportDoc.id,
        category: 'security',
        lat: 40.7135, // Slightly offset so it shows as a separate dot on the map!
        lng: -74.0050,
        text: "[STAFF RADIO] Suspicious bag spotted near Gate B.",
        source: 'staff',
        timestampMs: Date.now(),
        geofenceOk: true,
      });

      const incidentRef = doc(collection(db, 'incidents'), `inc_${newReportDoc.id}`);
      await setDoc(incidentRef, {
        id: incidentRef.id,
        severity: 3,
        confidence: 100,
        isSingleEvent: true,
        reasoningTrace: "System generated incident from STAFF RADIO report in category: security",
        status: 'open',
        assignedResponderId: null,
        centroid: { lat: 40.7135, lng: -74.0050 },
        ageSec: 0,
        timestampMs: Date.now()
      });
    } catch (error) {
      console.error("Failed to submit staff report", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: '#1a1a1a' }}>Command Center Dashboard</h1>
        
        <button 
          onClick={handleStaffReport}
          disabled={isSubmitting}
          style={{ 
            background: '#1565c0', color: 'white', padding: '0.75rem 1.5rem', 
            border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' 
          }}
        >
          {isSubmitting ? 'Transmitting...' : '+ Quick Staff Report'}
        </button>
      </header>

      {/* TWO-COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', height: '70vh' }}>
        
        {/* LEFT SIDE: LIVE MAP */}
        <div style={{ border: '2px solid #ccc', borderRadius: '8px', overflow: 'hidden', background: '#e0e0e0' }}>
          <MapContainer center={MAP_CENTER} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Draw a pulsing dot for every active incident */}
            {incidents.map((incident) => {
              if (!incident.centroid || !incident.centroid.lat || !incident.centroid.lng) return null;
              
              const isHighPriority = incident.severity >= 3;
              const color = isHighPriority ? '#d32f2f' : '#ff9800';

              return (
                <CircleMarker 
                  key={incident.id} 
                  center={[incident.centroid.lat, incident.centroid.lng]}
                  radius={isHighPriority ? 12 : 8}
                  pathOptions={{ color: color, fillColor: color, fillOpacity: 0.7 }}
                >
                  <Popup>
                    <strong>Priority {incident.severity}</strong><br/>
                    {incident.reasoningTrace}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* RIGHT SIDE: THE INCIDENT QUEUE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {incidents.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
              <h2>All Clear</h2>
              <p>No active incidents at this time.</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div 
                key={incident.id} 
                style={{ 
                  borderLeft: `6px solid ${incident.severity >= 3 ? '#d32f2f' : '#ff9800'}`,
                  background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    background: incident.severity >= 3 ? '#ffebee' : '#fff3e0', 
                    color: incident.severity >= 3 ? '#c62828' : '#e65100',
                    padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 'bold', fontSize: '0.85rem'
                  }}>
                    Priority {incident.severity}
                  </span>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>
                    {new Date(incident.timestampMs).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ margin: '0 0 1rem 0', fontWeight: '500', fontSize: '1.1rem' }}>{incident.reasoningTrace}</p>
                <button style={{ width: '100%', padding: '0.75rem', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Dispatch Security Team
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}