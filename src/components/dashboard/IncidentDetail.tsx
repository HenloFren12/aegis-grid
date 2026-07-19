import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../config/firebase';

const incidentMarkerIcon = L.divIcon({
  className: '',
  html: `
    <div
      style="
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #ff5252;
        border: 4px solid #ffffff;
        box-shadow: 0 0 0 5px rgba(255, 82, 82, 0.25);
      "
    ></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface IncidentReport {
  id?: string;
  category?: string;
  text?: string;
  source?: string;
  provenance?: string;
  timestampMs?: number;
  gateId?: string | null;
  locationLabel?: string;
  lat?: number;
  lng?: number;
}

interface IncidentDetailData {
  id: string;
  severity: number;
  confidence: number;
  status: string;
  timestampMs: number;
  reasoningTrace: string;
  reasoningSource?: 'gemini' | 'deterministic_fallback';
  categories: string[];
  reportCount: number;
  reports: IncidentReport[];
  centroid?: { lat: number; lng: number };
  telemetryCorroborated?: boolean;
  corroboratingGateId?: string | null;
  corroboratingGateDensityPct?: number | null;
  evidenceSummary?: string[];
  assignedResponderId?: string | null;
  routePath?: string[];
  etaSec?: number | null;
  routingReason?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  medical: 'Medical',
  security: 'Security',
  lost_child: 'Lost Child',
  other: 'Other',
};

function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value.replace(/_/g, ' ');
}

function severityLabel(severity: number): string {
  if (severity >= 5) return 'Critical Emergency';
  if (severity === 4) return 'High Priority Emergency';
  if (severity === 3) return 'Moderate Priority Incident';
  return 'Operational Incident';
}

function formatEta(etaSec: number): string {
  if (etaSec < 60) return `${Math.max(1, Math.round(etaSec))} sec`;
  return `${Math.max(1, Math.ceil(etaSec / 60))} min`;
}

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<IncidentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No incident ID was provided.');
      setLoading(false);
      return;
    }

    return onSnapshot(
      doc(db, 'incidents', id),
      (snapshot) => {
        if (!snapshot.exists()) {
          setIncident(null);
          setError('This incident could not be found.');
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        setIncident({
          id: snapshot.id,
          severity: Number(data.severity) || 1,
          confidence: Number(data.confidence) || 0,
          status: typeof data.status === 'string' ? data.status : 'open',
          timestampMs: Number(data.timestampMs) || Date.now(),
          reasoningTrace:
            typeof data.reasoningTrace === 'string'
              ? data.reasoningTrace
              : 'Incident awaiting operational reasoning.',
          reasoningSource: data.reasoningSource,
          categories: Array.isArray(data.categories)
            ? data.categories.filter((value): value is string => typeof value === 'string')
            : [],
          reportCount: Number(data.reportCount) || 1,
          reports: Array.isArray(data.reports) ? (data.reports as IncidentReport[]) : [],
          centroid:
            data.centroid &&
            typeof data.centroid === 'object' &&
            Number.isFinite(Number(data.centroid.lat)) &&
            Number.isFinite(Number(data.centroid.lng))
              ? { lat: Number(data.centroid.lat), lng: Number(data.centroid.lng) }
              : undefined,
          telemetryCorroborated: data.telemetryCorroborated === true,
          corroboratingGateId:
            typeof data.corroboratingGateId === 'string' ? data.corroboratingGateId : null,
          corroboratingGateDensityPct:
            data.corroboratingGateDensityPct !== null &&
            data.corroboratingGateDensityPct !== undefined &&
            Number.isFinite(Number(data.corroboratingGateDensityPct))
              ? Number(data.corroboratingGateDensityPct)
              : null,
          evidenceSummary: Array.isArray(data.evidenceSummary)
            ? data.evidenceSummary.filter((value): value is string => typeof value === 'string')
            : [],
          assignedResponderId:
            typeof data.assignedResponderId === 'string' ? data.assignedResponderId : null,
          routePath: Array.isArray(data.routePath)
            ? data.routePath.filter((value): value is string => typeof value === 'string')
            : [],
          etaSec:
            data.etaSec !== null && data.etaSec !== undefined && Number.isFinite(Number(data.etaSec))
              ? Number(data.etaSec)
              : null,
          routingReason: typeof data.routingReason === 'string' ? data.routingReason : null,
        });

        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Incident listener failed:', snapshotError);
        setError('Unable to synchronize incident details.');
        setLoading(false);
      },
    );
  }, [id]);

  const handleDispatchAndResolve = async (): Promise<void> => {
    if (!id || !incident) return;

    const confirmed = window.confirm(
      'Confirm that an operational team has been dispatched and this incident should be marked as resolved?',
    );

    if (!confirmed) return;

    setIsDispatching(true);
    setDispatchError(null);

    try {
      await updateDoc(doc(db, 'incidents', id), {
        status: 'resolved',
        resolvedAtMs: Date.now(),
        resolutionAction: 'team_dispatched',
      });
    } catch (dispatchFailure) {
      console.error('Unable to resolve incident:', dispatchFailure);
      setDispatchError('The incident could not be updated. Please retry before leaving this page.');
    } finally {
      setIsDispatching(false);
    }
  };

  const provenance = useMemo(() => {
    if (!incident) return [];

    const labels = new Set<string>();

    for (const report of incident.reports) {
      if (report.provenance === 'simulation' || report.source === 'simulator') {
        labels.add('SIMULATION');
      } else if (report.source === 'fan') {
        labels.add('LIVE SOS');
      } else if (report.source) {
        labels.add(report.source.toUpperCase());
      }
    }

    if (incident.telemetryCorroborated) {
      labels.add('TELEMETRY CORROBORATED');
    }

    return Array.from(labels);
  }, [incident]);

  if (loading) {
    return (
      <main
        style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#090a0d', color: '#fff' }}
      >
        Loading incident…
      </main>
    );
  }

  if (error || !incident) {
    return (
      <main style={{ minHeight: '100vh', background: '#090a0d', color: '#fff', padding: '2rem' }}>
        <button type="button" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>

        <p role="alert">{error ?? 'Incident unavailable.'}</p>
      </main>
    );
  }

  const etaSec = typeof incident.etaSec === 'number' ? incident.etaSec : null;
  const routePath = incident.routePath ?? [];
  const hasRealRoute = etaSec !== null && etaSec > 0 && routePath.length > 1;
  const isResolved = incident.status.toLowerCase() === 'resolved';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #090a0d 0%, #111318 100%)',
        color: '#f5f7fa',
        padding: 'clamp(1rem, 3vw, 2rem)',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent',
            border: 0,
            color: '#9ecbff',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '1.25rem',
            fontWeight: 700,
          }}
        >
          ← Back to Command Center
        </button>

        <header style={{ background: '#15181e', border: '1px solid #2f3742', borderRadius: '12px', padding: 'clamp(1.25rem, 4vw, 2rem)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0, flex: '1 1 400px' }}>
              <div style={{ color: '#ff8a80', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.78rem', marginBottom: '0.55rem' }}>
                Priority {incident.severity}/5
              </div>

              <h1 style={{ margin: 0, fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', lineHeight: 1.15, overflowWrap: 'anywhere' }}>
                {severityLabel(incident.severity)}
              </h1>

              <div style={{ color: '#8b949e', marginTop: '0.7rem', fontSize: '0.85rem', overflowWrap: 'anywhere' }}>
                Incident {incident.id}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(100px, 1fr))', gap: '0.65rem', flex: '0 1 300px' }}>
              <Metric label="Confidence" value={`${incident.confidence}%`} />
              <Metric label="Reports" value={`${incident.reportCount}`} />
              <Metric label="Status" value={incident.status.toUpperCase()} />
              <Metric label="Reasoning" value={incident.reasoningSource === 'gemini' ? 'GENAI' : 'FALLBACK'} />
            </div>
          </div>

          {provenance.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.25rem' }}>
              {provenance.map((label) => (
                <span
                  key={label}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '999px',
                    border: '1px solid #46505e',
                    background: '#20242b',
                    color: '#d8dee9',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <Panel title="Incident Evidence">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {incident.categories.map((category) => (
                <span
                  key={category}
                  style={{ padding: '0.35rem 0.6rem', background: '#2a2f38', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}
                >
                  {categoryLabel(category)}
                </span>
              ))}
            </div>

            {incident.reports.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {incident.reports.map((report, index) => (
                  <div
                    key={report.id ?? `${report.timestampMs}-${index}`}
                    style={{ background: '#20242b', border: '1px solid #333a45', borderRadius: '7px', padding: '0.9rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', color: '#9da5b0', fontSize: '0.75rem', marginBottom: '0.45rem' }}>
                      <strong>{categoryLabel(report.category ?? 'other')}</strong>
                      <span>{report.source === 'fan' ? 'Live SOS' : report.source ?? 'Unknown source'}</span>
                    </div>

                    <div style={{ color: '#f0f2f5', lineHeight: 1.5 }}>
                      {report.text || 'No description provided.'}
                    </div>

                    {report.locationLabel && (
                      <div style={{ color: '#9da5b0', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                        Location: {report.locationLabel}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No raw report evidence is available.</p>
            )}
          </Panel>

          <Panel title="Explainable AI Assessment">
            <p style={{ lineHeight: 1.65, color: '#e0e4e9', marginTop: 0 }}>{incident.reasoningTrace}</p>

            {incident.telemetryCorroborated && (
              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '7px', background: '#17291f', border: '1px solid #2e7d4f' }}>
                <strong style={{ color: '#69f0ae' }}>Independent telemetry corroboration</strong>

                <p style={{ margin: '0.5rem 0 0', lineHeight: 1.5 }}>
                  {incident.corroboratingGateId ? `Gate ${incident.corroboratingGateId}` : 'Nearby gate'} telemetry
                  independently supports this incident assessment
                  {incident.corroboratingGateDensityPct !== null
                    ? ` at ${incident.corroboratingGateDensityPct}% density.`
                    : '.'}
                </p>
              </div>
            )}

            {incident.evidenceSummary && incident.evidenceSummary.length > 0 && (
              <ul style={{ paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                {incident.evidenceSummary.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Incident Location">
            {incident.centroid && Number.isFinite(incident.centroid.lat) && Number.isFinite(incident.centroid.lng) ? (
              <>
                <div style={{ height: '360px', width: '100%', overflow: 'hidden', borderRadius: '8px', border: '1px solid #333a45', background: '#0b0d10' }}>
                  <MapContainer
                    center={[incident.centroid.lat, incident.centroid.lng]}
                    zoom={17}
                    scrollWheelZoom
                    style={{ width: '100%', height: '100%' }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    <Marker position={[incident.centroid.lat, incident.centroid.lng]} icon={incidentMarkerIcon}>
                      <Popup>
                        <strong>Incident location</strong>
                        <br />
                        Fused from {incident.reportCount} report{incident.reportCount === 1 ? '' : 's'}.
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.6rem', marginTop: '0.8rem' }}>
                  <Metric label="Latitude" value={incident.centroid.lat.toFixed(5)} />
                  <Metric label="Longitude" value={incident.centroid.lng.toFixed(5)} />
                </div>

                <p style={{ color: '#8b949e', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 0 }}>
                  Marker represents the fused incident location. A responder route is shown only when validated
                  routing data is available.
                </p>
              </>
            ) : (
              <div role="status" style={{ padding: '1rem', background: '#20242b', border: '1px solid #4b5563', borderRadius: '7px', color: '#aeb6c2' }}>
                No validated geographic location is available for this incident.
              </div>
            )}
          </Panel>

          <Panel title="Responder Dispatch">
            {hasRealRoute ? (
              <>
                <div style={{ fontSize: '2rem', fontWeight: 850 }}>
                  ETA {etaSec !== null ? formatEta(etaSec) : 'Unavailable'}
                </div>

                <p style={{ color: '#aeb6c2', lineHeight: 1.5 }}>
                  {incident.routingReason ?? 'ETA calculated from the current operational routing model.'}
                </p>

                <div style={{ marginTop: '1rem' }}>
                  <strong>Route</strong>

                  <div style={{ marginTop: '0.5rem', color: '#9ecbff', overflowWrap: 'anywhere' }}>
                    {routePath.join(' → ')}
                  </div>
                </div>
              </>
            ) : (
              <div role="status" style={{ padding: '1rem', border: '1px solid #4b5563', borderRadius: '7px', background: '#20242b' }}>
                <strong style={{ display: 'block', fontSize: '1.05rem' }}>
                  ETA awaiting validated responder route
                </strong>

                <p style={{ margin: '0.6rem 0 0', color: '#aeb6c2', lineHeight: 1.5 }}>
                  Aegis Grid will not display an unvalidated travel time. ETA becomes available when a responder is
                  assigned and a valid venue route has been calculated.
                </p>
              </div>
            )}

            {incident.assignedResponderId && (
              <p style={{ marginTop: '1rem' }}>
                Assigned responder: <strong>{incident.assignedResponderId}</strong>
              </p>
            )}

            {dispatchError && (
              <div
                role="alert"
                style={{ marginTop: '1rem', padding: '0.8rem', background: '#351719', border: '1px solid #8e3035', borderRadius: '7px', color: '#ffb4b4', lineHeight: 1.5 }}
              >
                {dispatchError}
              </div>
            )}

            {isResolved ? (
              <div
                role="status"
                style={{
                  marginTop: '1.25rem',
                  minHeight: '54px',
                  display: 'grid',
                  placeItems: 'center',
                  padding: '0.75rem',
                  boxSizing: 'border-box',
                  borderRadius: '7px',
                  background: '#17351f',
                  border: '1px solid #2e7d4f',
                  color: '#69f0ae',
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              >
                ✓ INCIDENT RESOLVED
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void handleDispatchAndResolve();
                }}
                disabled={isDispatching}
                aria-busy={isDispatching}
                style={{
                  width: '100%',
                  minHeight: '54px',
                  marginTop: '1.25rem',
                  border: '1px solid #43a047',
                  borderRadius: '7px',
                  background: isDispatching ? '#315c36' : '#43a047',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 850,
                  cursor: isDispatching ? 'wait' : 'pointer',
                }}
              >
                {isDispatching ? 'UPDATING INCIDENT…' : 'DISPATCH TEAM & RESOLVE'}
              </button>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: '#15181e', border: '1px solid #2f3742', borderRadius: '12px', padding: '1.25rem', minWidth: 0 }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#20242b', border: '1px solid #333a45', borderRadius: '7px', padding: '0.75rem', minWidth: 0 }}>
      <div style={{ color: '#8b949e', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>

      <div style={{ marginTop: '0.3rem', fontWeight: 800, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );
}