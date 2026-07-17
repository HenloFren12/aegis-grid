import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import '../../styles/riskPalette.css';

// Central Command Post Location (Where security is dispatched from)
const COMMAND_POST = { lat: 40.7120, lng: -74.0050 };

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'incidents', id)).then(snap => {
      if (snap.exists()) setIncident(snap.data());
    });
  }, [id]);

  if (!incident) {
    return (
      <div style={{ color: 'white', padding: '2rem', backgroundColor: '#121212', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Decrypting Incident Data...
      </div>
    );
  }

  // Create the Polyline route array [Start, End]
  const routingPath = [
    [COMMAND_POST.lat, COMMAND_POST.lng],
    [incident.centroid.lat, incident.centroid.lng]
  ];

  return (
    <div style={{ padding: '2rem', color: 'white', backgroundColor: '#121212', minHeight: '100vh', fontFamily: 'system-ui' }}>
      
      <button 
        onClick={() => navigate('/dashboard')} 
        style={{ marginBottom: '1.5rem', padding: '0.75rem 1.5rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        &larr; Back to Dashboard Queue
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Left Column: AI Analysis & Controls */}
        <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '8px', borderLeft: `6px solid ${incident.severity >= 4 ? '#c62828' : '#ef6c00'}` }}>
          
          <h1 style={{ color: incident.severity >= 4 ? '#ef5350' : '#ffb74d', marginTop: 0, marginBottom: '0.5rem' }}>
            Priority {incident.severity} Emergency
          </h1>
          
          <div style={{ color: '#aaa', fontSize: '1.1rem', marginBottom: '2rem', fontFamily: 'monospace' }}>
            ID: {incident.id} | STATUS: <span style={{ textTransform: 'uppercase', color: incident.status === 'open' ? '#ef5350' : '#4caf50', fontWeight: 'bold' }}>{incident.status}</span>
          </div>
          
          <div style={{ background: '#2a2a2a', padding: '1.5rem', borderRadius: '4px', marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0, color: '#aaa', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>AI Reasoning Trace</h3>
            <p style={{ fontSize: '1.2rem', lineHeight: '1.6', margin: 0 }}>{incident.reasoningTrace}</p>
          </div>

          <div style={{ background: '#2a2a2a', padding: '1.5rem', borderRadius: '4px', marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0, color: '#aaa', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>System Confidence</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ height: '10px', background: '#444', borderRadius: '5px', flexGrow: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${incident.confidence}%`, background: '#4caf50' }}></div>
              </div>
              <span style={{ fontWeight: 'bold' }}>{incident.confidence}%</span>
            </div>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
              {incident.isSingleEvent ? 'Isolated event.' : 'Multiple reports fused into single incident.'}
            </p>
          </div>

          {incident.status === 'open' && (
            <button
              onClick={async () => {
                await updateDoc(doc(db, 'incidents', id as string), { status: 'resolved' });
                navigate('/dashboard');
              }}
              style={{ width: '100%', padding: '1rem 2rem', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', textTransform: 'uppercase' }}
            >
              Dispatch Team & Resolve
            </button>
          )}
        </div>

        {/* Right Column: Tactical Routing Map */}
        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', minHeight: '500px' }}>
          <MapContainer 
            center={[incident.centroid.lat, incident.centroid.lng]} 
            zoom={16} 
            style={{ height: '100%', width: '100%', background: '#121212' }}
          >
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
              attribution='&copy; OpenStreetMap'
            />
            
            {/* The Target Incident */}
            <CircleMarker 
              center={[incident.centroid.lat, incident.centroid.lng]} 
              radius={12} 
              pathOptions={{ color: '#c62828', fillColor: '#ef5350', fillOpacity: 0.8 }}
            >
              <Popup>Emergency Location</Popup>
            </CircleMarker>

            {/* The Command Post (Dispatch Origin) */}
            <CircleMarker 
              center={[COMMAND_POST.lat, COMMAND_POST.lng]} 
              radius={8} 
              pathOptions={{ color: '#1565c0', fillColor: '#2196f3', fillOpacity: 1 }}
            >
              <Popup>Command Post (Dispatch)</Popup>
            </CircleMarker>

            {/* The Tactical Routing Line */}
            <Polyline 
              // @ts-ignore - Leaflet types can be strict with coordinate arrays
              positions={routingPath} 
              pathOptions={{ color: '#2196f3', weight: 4, dashArray: '10, 10' }} 
            />
          </MapContainer>
        </div>

      </div>
    </div>
  );
}