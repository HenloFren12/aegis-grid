import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      const q = query(collection(db, 'incidents'), orderBy('timestampMs', 'desc'), limit(50));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => d.data()));
    };
    fetchLogs();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    // 1. Format headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Incident ID,Severity,Status,AI Reasoning\n";
    
    // 2. Map data rows
    logs.forEach(log => {
      const date = new Date(log.timestampMs).toISOString();
      const cleanReasoning = log.reasoningTrace.replace(/"/g, '""'); // Escape quotes for CSV
      csvContent += `${date},${log.id},${log.severity},${log.status},"${cleanReasoning}"\n`;
    });
    
    // 3. Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aegis_Audit_Log_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem', color: 'white', backgroundColor: '#121212', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ marginBottom: '2rem', padding: '0.75rem 1.5rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          &larr; Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>Command Center Ledger</h2>
            <p style={{ color: '#aaa', margin: 0, fontSize: '1.1rem' }}>Immutable record of AI decisions and system routing.</p>
          </div>
          
          <button 
            onClick={handleExportCSV}
            style={{ background: '#2196f3', color: 'white', padding: '1rem 2rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
          >
            &#11123; Export CSV for Compliance
          </button>
        </div>
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          {logs.map((log, idx) => (
            <div key={idx} className="animate-slide-up" style={{ background: '#1e1e1e', padding: '1.5rem', borderRadius: '4px', borderLeft: `6px solid ${log.severity >= 4 ? '#ef5350' : '#2196f3'}`, animationDelay: `${idx * 0.05}s` }}>
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{new Date(log.timestampMs).toLocaleString()}</span>
                <span style={{ fontFamily: 'monospace' }}>ID: {log.id}</span>
              </div>
              <div style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>{log.reasoningTrace}</div>
            </div>
          ))}
          {logs.length === 0 && <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>No system records found.</p>}
        </div>
      </div>
    </div>
  );
}