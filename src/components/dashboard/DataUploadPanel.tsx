import { useState, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Papa from 'papaparse';

interface ExpectedCSVRow {
  gateId: string;
  currentCount: string;
  capacity: string;
  previousCount: string;
  secondsSinceLastReading: string;
}

export default function DataUploadPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev]);

  const processFile = (file: File) => {
    setIsProcessing(true);
    addLog(`[SYSTEM] Initiating parse for: ${file.name}`);

    Papa.parse<ExpectedCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        addLog(`[SUCCESS] Parsed ${results.data.length} rows. Validating schema...`);
        let successCount = 0;
        let errorCount = 0;

        for (const [index, row] of results.data.entries()) {
          try {
            // 1. Strict Schema Validation
            if (!row.gateId || !row.currentCount || !row.capacity) {
              throw new Error(`Missing required columns in row ${index + 1}`);
            }

            const capacity = Number(row.capacity);
            if (capacity <= 0) throw new Error(`Invalid capacity in row ${index + 1}`);

            const payload = {
              gateId: row.gateId.trim(),
              currentCount: Number(row.currentCount),
              capacity: capacity,
              previousCount: Number(row.previousCount) || 0,
              secondsSinceLastReading: Number(row.secondsSinceLastReading) || 60,
              lastUpdated: Date.now()
            };

            // 2. Write to Firestore (This triggers your backend AI Cloud Function!)
            const gateRef = doc(db, 'gates', payload.gateId);
            await setDoc(gateRef, payload, { merge: true });
            
            successCount++;
          } catch (err: any) {
            errorCount++;
            addLog(`[ROW ERROR] ${err.message}`);
          }
        }

        addLog(`[COMPLETE] Ingestion finished. ${successCount} processed, ${errorCount} rejected.`);
        setIsProcessing(false);
      },
      error: (error) => {
        addLog(`[FATAL ERROR] CSV Parsing failed: ${error.message}`);
        setIsProcessing(false);
      }
    });
  };

  const handleUploadClick = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      processFile(file);
    } else {
      addLog("[WARNING] Please select a CSV file first.");
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
      <h2>Stadium Data Ingestion Engine</h2>
      <p style={{ color: '#aaa' }}>
        Upload a CSV containing live gate readings. Valid rows are written to Firestore, instantly triggering the AI Foresight Engine for cross-gate reasoning.
      </p>

      <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef}
            style={{ padding: '0.5rem', background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: '4px', flexGrow: 1 }}
          />
          <button 
            onClick={handleUploadClick} 
            disabled={isProcessing}
            style={{ background: '#1976d2', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isProcessing ? 'wait' : 'pointer' }}
          >
            {isProcessing ? 'Processing...' : 'UPLOAD & INGEST'}
          </button>
        </div>
        
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#888' }}>
          <strong>Required CSV Headers:</strong> gateId, currentCount, capacity, previousCount, secondsSinceLastReading
        </div>
      </div>

      <div style={{ background: 'black', color: '#00ff00', padding: '1rem', borderRadius: '8px', height: '300px', overflowY: 'auto', fontFamily: 'monospace' }}>
        {logs.length === 0 ? <p style={{ color: '#555' }}>System ready. Awaiting data payload...</p> : logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '0.5rem' }}>{log}</div>
        ))}
      </div>
    </div>
  );
}