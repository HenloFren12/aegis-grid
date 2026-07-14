import React, { useState } from 'react';
import Papa from 'papaparse';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const REQUIRED_COLUMNS = ['gateId', 'currentCount', 'capacity', 'previousCount', 'secondsSinceLastReading'];

export default function DataUploadPanel() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = (file: File) => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const missing = REQUIRED_COLUMNS.filter(col => !results.meta.fields?.includes(col));
        if (missing.length > 0) {
          setError(`CSV is missing required column(s): ${missing.join(', ')}`);
          setIsUploading(false);
          return;
        }

        try {
          const rows = results.data as Record<string, any>[];
          
          // Optimization: Execute all Firestore writes concurrently instead of sequentially
          const uploadPromises = rows.map(row => {
            const gateRef = doc(db, 'gates', String(row.gateId));
            return setDoc(gateRef, row, { merge: true });
          });

          await Promise.all(uploadPromises);
          
          setSuccess(`Successfully uploaded ${rows.length} gate readings.`);
        } catch (err: any) {
          setError(`Upload failed: ${err.message}`);
        } finally {
          setIsUploading(false);
        }
      },
    });
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '500px' }}>
      <h2>Data Upload (CSV)</h2>
      <input 
        type="file" 
        accept=".csv" 
        disabled={isUploading}
        onChange={e => e.target.files && handleFile(e.target.files[0])} 
      />
      {isUploading && <p>Uploading...</p>}
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      {success && <p role="status" style={{ color: 'green' }}>{success}</p>}
    </div>
  );
}