import '../../styles/riskPalette.css';

export default function GateRiskCard({ gate }: { gate: any }) {
  const getRiskStyles = (level: string) => {
    if (level === 'CRITICAL') return { class: 'risk-critical', icon: '🚨' };
    if (level === 'HIGH') return { class: 'risk-high', icon: '⚠️' };
    if (level === 'MODERATE') return { class: 'risk-moderate', icon: '👀' };
    return { class: 'risk-low', icon: '✓' };
  };
  
  const risk = getRiskStyles(gate.ruleBasedLevel || 'LOW');

  return (
    <div style={{ background: '#1e1e1e', padding: '1.25rem', borderRadius: '8px', borderLeft: `6px solid ${risk.class === 'risk-critical' ? '#c62828' : risk.class === 'risk-high' ? '#ef6c00' : '#1565c0'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <strong style={{ fontSize: '1.2rem', color: 'white' }}>{gate.gateId}</strong>
        <span className={`risk-badge ${risk.class}`}>
          {risk.icon} {gate.ruleBasedLevel || 'LOW'}
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', color: '#ccc', fontSize: '0.95rem' }}>
        <div><strong>Density:</strong> {Math.round(gate.densityPct || 0)}%</div>
        <div>
          <strong>Time to Critical:</strong> {' '}
          {gate.timeToCriticalSec === Infinity || !gate.timeToCriticalSec 
            ? 'Stable' 
            : `${Math.round(gate.timeToCriticalSec / 60)} min`}
        </div>
      </div>
      
      {gate.narrative && (
        <div aria-live="polite" style={{ background: '#2a2a2a', color: '#e0e0e0', padding: '1rem', borderRadius: '4px', fontSize: '1rem', lineHeight: '1.5' }}>
          <strong style={{ color: '#fff' }}>AI Foresight:</strong> {gate.narrative}
        </div>
      )}
    </div>
  );
}