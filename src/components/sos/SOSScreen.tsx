import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface ReportDocument {
  id: string;
  category: 'medical' | 'security' | 'lost_child' | 'other';
  lat: number;
  lng: number;
  text: string;
  source: 'fan' | 'staff';
  timestampMs: number;
  geofenceOk: boolean; 
}

type Category = ReportDocument['category'];

const STADIUM_ZONES: Record<string, { lat: number, lng: number }> = {
  'North Gate': { lat: 40.7128, lng: -74.0060 },
  'South Gate': { lat: 40.7120, lng: -74.0060 },
  'Section 100s': { lat: 40.7125, lng: -74.0055 },
  'Section 200s': { lat: 40.7125, lng: -74.0065 },
};

export default function SOSScreen() {
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [zone, setZone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const writeToDatabase = async (lat: number, lng: number, isGPS: boolean) => {
    try {
      const reportsRef = collection(db, 'reports');
      const newReportDoc = doc(reportsRef);

      const payload: ReportDocument = {
        id: newReportDoc.id,
        category: category!,
        lat,
        lng,
        text: zone ? `[Manual Zone: ${zone}] ${description}` : description,
        source: 'fan',
        timestampMs: Date.now(),
        geofenceOk: isGPS,
      };

      // EXACT FIX: We ONLY write to the reports collection. 
      // The Cloud Function takes over from here.
      await setDoc(newReportDoc, payload);

      setSuccess(true);
    } catch (err: any) {
      setError(`Failed to send report: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return setError("Please select an emergency category.");

    setIsSubmitting(true);
    setError(null);

    if (zone) {
      const fallbackCoords = STADIUM_ZONES[zone];
      return writeToDatabase(fallbackCoords.lat, fallbackCoords.lng, false);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => writeToDatabase(position.coords.latitude, position.coords.longitude, true),
        () => {
          setError("We couldn't detect your exact GPS. Please select your nearest gate or section from the dropdown.");
          setIsSubmitting(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError("Your device doesn't support GPS. Please select a location from the dropdown.");
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h1 style={{ color: 'green' }}>Help is on the way.</h1>
        <p>Your location has been sent directly to stadium security.</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '2rem', padding: '1rem' }}>Submit Another Report</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#d32f2f' }}>Emergency SOS</h1>
      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {(['medical', 'security', 'lost_child', 'other'] as Category[]).map((cat) => (
            <button
              key={cat} type="button" onClick={() => setCategory(cat)}
              style={{
                padding: '1rem',
                border: `2px solid ${category === cat ? '#d32f2f' : '#ccc'}`,
                background: category === cat ? '#ffebee' : 'white',
                color: category === cat ? '#d32f2f' : '#121212',
                fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize'
              }}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <select 
          value={zone} 
          onChange={(e) => setZone(e.target.value)}
          style={{ padding: '1rem', border: '1px solid #ccc' }}
        >
          <option value="">I don't know my gate (Use Auto-GPS)</option>
          {Object.keys(STADIUM_ZONES).map(z => <option key={z} value={z}>{z}</option>)}
        </select>

        <textarea
          rows={3} placeholder="Additional details..." value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: '1rem', border: '1px solid #ccc' }}
        />

        <button 
          type="submit" disabled={isSubmitting}
          style={{ background: '#d32f2f', color: 'white', padding: '1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          {isSubmitting ? 'Sending...' : 'SEND SOS NOW'}
        </button>
      </form>
    </div>
  );
}