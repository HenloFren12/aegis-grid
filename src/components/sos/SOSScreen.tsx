import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai'; // The new official SDK

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

// 🛑 PASTE YOUR AQ. GEMINI API KEY HERE 🛑
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY); // Initializes the AI securely

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

      await setDoc(newReportDoc, payload);

      // Default fallback just in case
      let aiSeverity = category === 'medical' || category === 'security' ? 3 : 1;
      let aiActionPlan = `System generated incident from fan report in category: ${category}`;

      try {
        console.log("Contacting Gemini AI via official SDK...");
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
        const prompt = `You are a stadium security triage AI. 
        A fan just reported an emergency. Category: "${category}". Additional details: "${description || 'None provided'}". 
        1. Determine the severity level from 1 (lowest) to 5 (critical). 
        2. Provide a short, 1-sentence action plan for the security team.
        Respond STRICTLY in JSON format looking exactly like this: {"severity": 3, "actionPlan": "Dispatch medical team immediately."}`;

        const result = await model.generateContent(prompt);
        const aiResponseText = result.response.text();
        
        // Clean the response
        const cleanJson = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiAnalysis = JSON.parse(cleanJson);
        
        aiSeverity = aiAnalysis.severity;
        aiActionPlan = `[GEMINI AI] ${aiAnalysis.actionPlan}`;
        console.log("AI Triage Complete!");
      } catch (aiError) {
        console.error("Gemini AI failed:", aiError);
      }

      // Generate the AI-Enhanced Incident
      const incidentRef = doc(collection(db, 'incidents'), `inc_${newReportDoc.id}`);
      await setDoc(incidentRef, {
        id: incidentRef.id,
        severity: aiSeverity,
        confidence: 95,
        isSingleEvent: true,
        reasoningTrace: aiActionPlan,
        status: 'open',
        assignedResponderId: null,
        centroid: { lat, lng },
        ageSec: 0,
        timestampMs: Date.now()
      });

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
          {isSubmitting ? 'AI Analyzing & Sending...' : 'SEND SOS NOW'}
        </button>
      </form>
    </div>
  );
}