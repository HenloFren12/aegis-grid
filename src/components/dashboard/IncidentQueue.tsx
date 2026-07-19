import { useNavigate } from 'react-router-dom';
import type { IncidentViewModel } from './Dashboard';
import '../../styles/riskPalette.css';

const CATEGORY_LABELS: Record<string, string> = {
  medical: 'Medical',
  security: 'Security',
  lost_child: 'Lost Child',
  other: 'Other',
};

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ');
}

function getIncidentTitle(incident: IncidentViewModel): string {
  const categories = incident.categories ?? [];
  if (categories.length === 0) return 'Operational Incident';
  if (categories.length === 1) return `${getCategoryLabel(categories[0])} Incident`;
  return 'Multi-Signal Incident';
}

function getReportSummary(incident: IncidentViewModel): string {
  const reports = incident.reports ?? [];
  const report = reports.find((item) => typeof item.text === 'string' && item.text.trim().length > 0);
  return report?.text ?? incident.reasoningTrace ?? 'Incident awaiting operational analysis.';
}

function compareIncidents(first: IncidentViewModel, second: IncidentViewModel): number {
  if (first.severity !== second.severity) return second.severity - first.severity;
  return (first.timestampMs ?? 0) - (second.timestampMs ?? 0);
}

function getRiskStyle(severity: number) {
  if (severity >= 5) return { className: 'risk-critical', label: 'Critical', symbol: '🚨', border: '#c62828' };
  if (severity === 4) return { className: 'risk-high', label: 'High', symbol: '⚠', border: '#ef6c00' };
  if (severity === 3) return { className: 'risk-moderate', label: 'Moderate', symbol: '●', border: '#f9a825' };
  return { className: 'risk-low', label: 'Low', symbol: '✓', border: '#1565c0' };
}

interface IncidentQueueProps {
  incidents: IncidentViewModel[];
}

export default function IncidentQueue({ incidents }: IncidentQueueProps) {
  const navigate = useNavigate();
  const sortedIncidents = [...incidents].sort(compareIncidents);

  return (
    <section aria-labelledby="triage-heading" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      <h2 id="triage-heading" style={{ color: 'white', marginTop: 0, marginBottom: '0.75rem' }}>
        Active Triage Queue
      </h2>

      <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sortedIncidents.length === 0 ? (
          <div style={{ background: '#1e1e1e', color: '#aaa', padding: '2rem', textAlign: 'center', borderRadius: '8px' }}>
            No active incidents.
          </div>
        ) : (
          sortedIncidents.map((incident) => {
            const risk = getRiskStyle(incident.severity);
            const title = getIncidentTitle(incident);
            const summary = getReportSummary(incident);
            const reasoningTrace = incident.reasoningTrace ?? 'Incident awaiting operational analysis.';
            const categories = incident.categories ?? [];
            const timestampMs = incident.timestampMs ?? Date.now();

            return (
              <article
                key={incident.id}
                className={`animate-slide-up ${risk.className === 'risk-critical' ? 'pulse-border-critical' : risk.className === 'risk-high' ? 'pulse-border-high' : ''}`}
                style={{ background: '#1e1e1e', borderRadius: '8px', padding: '1.25rem', borderLeft: `6px solid ${risk.border}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {risk.symbol} Priority {incident.severity} · {risk.label}
                    </div>
                    <h3 style={{ margin: '0.4rem 0 0', color: 'white' }}>{title}</h3>
                  </div>

                  <time dateTime={new Date(timestampMs).toISOString()} style={{ color: '#888', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(timestampMs).toLocaleTimeString()}
                  </time>
                </div>

                {categories.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.8rem' }}>
                    {categories.map((category) => (
                      <span key={category} style={{ background: '#303030', padding: '0.25rem 0.5rem', borderRadius: '4px', color: '#ddd', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {getCategoryLabel(category)}
                      </span>
                    ))}
                  </div>
                )}

                <p style={{ color: '#f5f5f5', lineHeight: 1.5, margin: '1rem 0 0.5rem' }}>{summary}</p>

                {summary !== reasoningTrace && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#171717', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', color: '#aaa', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      AI reasoning
                    </strong>
                    <span style={{ color: '#ccc', lineHeight: 1.45 }}>{reasoningTrace}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
                  <div style={{ background: '#272727', padding: '0.65rem', borderRadius: '5px' }}>
                    <small style={{ color: '#999' }}>Reports</small>
                    <div>{incident.reportCount ?? incident.reports?.length ?? 1}</div>
                  </div>

                  <div style={{ background: '#272727', padding: '0.65rem', borderRadius: '5px' }}>
                    <small style={{ color: '#999' }}>Confidence</small>
                    <div>{incident.confidence ?? 0}%</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/incident/${incident.id}`)}
                  style={{ width: '100%', marginTop: '1rem', minHeight: '44px', border: '1px solid #555', borderRadius: '5px', background: '#333', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Review incident →
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}