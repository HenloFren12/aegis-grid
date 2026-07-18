import {
  useEffect,
  useState,
} from 'react';

import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import {
  useNavigate,
} from 'react-router-dom';

import { db } from '../../config/firebase';

import '../../styles/riskPalette.css';

interface QueuedIncident {
  id: string;
  severity: number;
  confidence: number;
  timestampMs: number;
  updatedAtMs?: number;

  reasoningTrace: string;

  reasoningSource?:
    | 'gemini'
    | 'deterministic_fallback';

  status: string;

  reportCount?: number;

  categories?: string[];

  centroid?: {
    lat: number;
    lng: number;
  };
}

function compareIncidents(
  first: QueuedIncident,
  second: QueuedIncident,
): number {
  /*
   * Higher severity always wins.
   *
   * For equal severity, the older incident
   * receives priority.
   */
  if (
    first.severity !==
    second.severity
  ) {
    return (
      second.severity -
      first.severity
    );
  }

  return (
    first.timestampMs -
    second.timestampMs
  );
}

function getRiskStyles(
  severity: number,
) {
  if (severity >= 5) {
    return {
      className: 'risk-critical',
      text: 'Critical',
      icon: '🚨',
      border: '#c62828',
    };
  }

  if (severity === 4) {
    return {
      className: 'risk-high',
      text: 'High',
      icon: '⚠️',
      border: '#ef6c00',
    };
  }

  if (severity === 3) {
    return {
      className:
        'risk-moderate',
      text: 'Moderate',
      icon: '●',
      border: '#f9a825',
    };
  }

  return {
    className: 'risk-low',
    text: 'Low',
    icon: '✓',
    border: '#1565c0',
  };
}

export default function IncidentQueue() {
  const [incidents, setIncidents] =
    useState<QueuedIncident[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const activeIncidentQuery =
      query(
        collection(
          db,
          'incidents',
        ),

        where(
          'status',
          '==',
          'open',
        ),
      );

    const unsubscribe =
      onSnapshot(
        activeIncidentQuery,

        (snapshot) => {
          const liveIncidents =
            snapshot.docs
              .map((document) => {
                const data =
                  document.data();

                return {
                  id: document.id,

                  severity:
                    Number(
                      data.severity,
                    ) || 1,

                  confidence:
                    Number(
                      data.confidence,
                    ) || 0,

                  timestampMs:
                    Number(
                      data.timestampMs,
                    ) || Date.now(),

                  updatedAtMs:
                    Number(
                      data.updatedAtMs,
                    ) || undefined,

                  reasoningTrace:
                    typeof data.reasoningTrace ===
                    'string'
                      ? data.reasoningTrace
                      : 'Incident awaiting analysis.',

                  reasoningSource:
                    data.reasoningSource,

                  status:
                    data.status ??
                    'open',

                  reportCount:
                    Number(
                      data.reportCount,
                    ) || 1,

                  categories:
                    Array.isArray(
                      data.categories,
                    )
                      ? data.categories
                      : [],

                  centroid:
                    data.centroid,
                } satisfies QueuedIncident;
              })
              .sort(
                compareIncidents,
              );

          setIncidents(
            liveIncidents,
          );

          setError(null);
        },

        (snapshotError) => {
          console.error(
            'Incident queue synchronization failed:',
            snapshotError,
          );

          setError(
            'Unable to synchronize the live incident queue.',
          );
        },
      );

    return unsubscribe;
  }, []);

  return (
    <section
      aria-labelledby="incident-queue-heading"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '100%',
        overflowY: 'auto',
        paddingRight: '0.5rem',
      }}
    >
      <h2
        id="incident-queue-heading"
        style={{
          color: 'white',
          marginTop: 0,
          marginBottom: '0.5rem',
        }}
      >
        Active Triage Queue
      </h2>

      {error && (
        <div
          role="alert"
          style={{
            background:
              '#3a1616',
            color: '#ffcdd2',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      <div
        aria-live="polite"
        aria-atomic="false"
      >
        {incidents.length ===
        0 ? (
          <div
            style={{
              background:
                '#1e1e1e',
              color: '#aaa',
              padding: '2rem',
              textAlign:
                'center',
              borderRadius: '8px',
            }}
          >
            No active incidents at
            this time.
          </div>
        ) : (
          incidents.map(
            (incident) => {
              const risk =
                getRiskStyles(
                  incident.severity,
                );

              return (
                <article
                  key={
                    incident.id
                  }
                  className={`animate-slide-up ${
                    risk.className ===
                    'risk-critical'
                      ? 'pulse-border-critical'
                      : risk.className ===
                          'risk-high'
                        ? 'pulse-border-high'
                        : ''
                  }`}
                  style={{
                    background:
                      '#1e1e1e',
                    borderRadius:
                      '8px',
                    padding:
                      '1.5rem',
                    borderLeft: `6px solid ${risk.border}`,
                    marginBottom:
                      '1rem',
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'flex-start',
                      gap: '1rem',
                      marginBottom:
                        '1rem',
                    }}
                  >
                    <span
                      className={`risk-badge ${risk.className}`}
                    >
                      {risk.icon}{' '}
                      Priority{' '}
                      {
                        incident.severity
                      }{' '}
                      — {risk.text}
                    </span>

                    <time
                      dateTime={new Date(
                        incident.timestampMs,
                      ).toISOString()}
                      style={{
                        color:
                          '#aaa',
                        fontSize:
                          '0.85rem',
                      }}
                    >
                      {new Date(
                        incident.timestampMs,
                      ).toLocaleTimeString()}
                    </time>
                  </div>

                  <div
                    style={{
                      color:
                        '#ddd',
                      fontSize:
                        '0.9rem',
                      marginBottom:
                        '0.75rem',
                    }}
                  >
                    {incident.reportCount ??
                      1}{' '}
                    report
                    {(incident.reportCount ??
                      1) !== 1
                      ? 's'
                      : ''}

                    {' · '}

                    Confidence{' '}
                    {
                      incident.confidence
                    }
                    %
                  </div>

                  <p
                    style={{
                      color:
                        'white',
                      fontSize:
                        '1.05rem',
                      lineHeight:
                        '1.5',
                      marginBottom:
                        '1.5rem',
                    }}
                  >
                    {
                      incident.reasoningTrace
                    }
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/incident/${incident.id}`,
                      )
                    }
                    style={{
                      width:
                        '100%',
                      background:
                        '#333',
                      color:
                        'white',
                      border:
                        'none',
                      padding:
                        '0.75rem',
                      borderRadius:
                        '4px',
                      cursor:
                        'pointer',
                      fontWeight:
                        'bold',
                    }}
                  >
                    Review &amp;
                    Dispatch
                    Responder →
                  </button>
                </article>
              );
            },
          )
        )}
      </div>
    </section>
  );
}