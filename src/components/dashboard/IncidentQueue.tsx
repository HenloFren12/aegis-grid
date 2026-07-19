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

interface IncidentReport {
  id?: string;
  category?: string;
  text?: string;
  timestampMs?: number;
  lat?: number;
  lng?: number;
  gateId?: string | null;
  locationLabel?: string;
}

interface QueuedIncident {
  id: string;
  severity: number;
  confidence: number;
  timestampMs: number;

  reasoningTrace: string;

  reasoningSource?:
    | 'gemini'
    | 'deterministic_fallback';

  status: string;

  reportCount: number;

  categories: string[];

  reports: IncidentReport[];

  centroid?: {
    lat: number;
    lng: number;
  };
}

const CATEGORY_LABELS: Record<
  string,
  string
> = {
  medical: 'Medical',
  security: 'Security',
  lost_child: 'Lost Child',
  other: 'Other',
};

function getCategoryLabel(
  category: string,
): string {
  return (
    CATEGORY_LABELS[
      category
    ] ??
    category.replace(
      /_/g,
      ' ',
    )
  );
}

function getIncidentTitle(
  incident: QueuedIncident,
): string {
  if (
    incident.categories.length ===
    0
  ) {
    return 'Operational Incident';
  }

  if (
    incident.categories.length ===
    1
  ) {
    return `${getCategoryLabel(
      incident.categories[0],
    )} Incident`;
  }

  return 'Multi-Signal Incident';
}

function getReportSummary(
  incident: QueuedIncident,
): string {
  const meaningfulReport =
    incident.reports.find(
      (report) =>
        typeof report.text ===
          'string' &&
        report.text.trim()
          .length > 0,
    );

  if (
    meaningfulReport?.text
  ) {
    return meaningfulReport.text;
  }

  return incident.reasoningTrace;
}

function compareIncidents(
  first: QueuedIncident,
  second: QueuedIncident,
): number {
  /*
   * Severity dominates.
   *
   * Older incidents win ties,
   * preventing starvation.
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

function getRiskStyle(
  severity: number,
) {
  if (severity >= 5) {
    return {
      className:
        'risk-critical',
      label: 'Critical',
      symbol: '🚨',
      border:
        '#c62828',
    };
  }

  if (severity === 4) {
    return {
      className:
        'risk-high',
      label: 'High',
      symbol: '⚠',
      border:
        '#ef6c00',
    };
  }

  if (severity === 3) {
    return {
      className:
        'risk-moderate',
      label: 'Moderate',
      symbol: '●',
      border:
        '#f9a825',
    };
  }

  return {
    className:
      'risk-low',
    label: 'Low',
    symbol: '✓',
    border:
      '#1565c0',
  };
}

export default function IncidentQueue() {
  const [
    incidents,
    setIncidents,
  ] = useState<
    QueuedIncident[]
  >([]);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const navigate =
    useNavigate();

  useEffect(() => {
    const incidentQuery =
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

    return onSnapshot(
      incidentQuery,

      (snapshot) => {
        const nextIncidents =
          snapshot.docs
            .map(
              (
                document,
              ): QueuedIncident => {
                const data =
                  document.data();

                const reports =
                  Array.isArray(
                    data.reports,
                  )
                    ? (data.reports as IncidentReport[])
                    : [];

                const categories =
                  Array.isArray(
                    data.categories,
                  )
                    ? data.categories.filter(
                        (
                          item,
                        ): item is string =>
                          typeof item ===
                          'string',
                      )
                    : [];

                return {
                  id:
                    document.id,

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
                    ) ||
                    Date.now(),

                  reasoningTrace:
                    typeof data.reasoningTrace ===
                    'string'
                      ? data.reasoningTrace
                      : 'Incident awaiting operational analysis.',

                  reasoningSource:
                    data.reasoningSource,

                  status:
                    typeof data.status ===
                    'string'
                      ? data.status
                      : 'open',

                  reportCount:
                    Number(
                      data.reportCount,
                    ) ||
                    reports.length ||
                    1,

                  categories,

                  reports,

                  centroid:
                    data.centroid,
                };
              },
            )
            .sort(
              compareIncidents,
            );

        setIncidents(
          nextIncidents,
        );

        setError(null);
      },

      (snapshotError) => {
        console.error(
          'Incident queue listener failed:',
          snapshotError,
        );

        setError(
          'Unable to synchronize the live incident queue.',
        );
      },
    );
  }, []);

  return (
    <section
      aria-labelledby="triage-heading"
      style={{
        display: 'flex',
        flexDirection:
          'column',
        height: '100%',
        overflowY: 'auto',
        paddingRight:
          '0.5rem',
      }}
    >
      <h2
        id="triage-heading"
        style={{
          color: 'white',
          marginTop: 0,
          marginBottom:
            '0.75rem',
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
            color:
              '#ffcdd2',
            padding: '1rem',
            borderRadius:
              '6px',
            marginBottom:
              '1rem',
          }}
        >
          {error}
        </div>
      )}

      <div
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection:
            'column',
          gap: '1rem',
        }}
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
              borderRadius:
                '8px',
            }}
          >
            No active incidents.
          </div>
        ) : (
          incidents.map(
            (incident) => {
              const risk =
                getRiskStyle(
                  incident.severity,
                );

              const title =
                getIncidentTitle(
                  incident,
                );

              const summary =
                getReportSummary(
                  incident,
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
                      '1.25rem',
                    borderLeft: `6px solid ${risk.border}`,
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
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize:
                            '0.75rem',
                          color:
                            '#aaa',
                          textTransform:
                            'uppercase',
                          letterSpacing:
                            '0.08em',
                        }}
                      >
                        {risk.symbol}{' '}
                        Priority{' '}
                        {
                          incident.severity
                        }{' '}
                        · {
                          risk.label
                        }
                      </div>

                      <h3
                        style={{
                          margin:
                            '0.4rem 0 0',
                          color:
                            'white',
                        }}
                      >
                        {title}
                      </h3>
                    </div>

                    <time
                      dateTime={new Date(
                        incident.timestampMs,
                      ).toISOString()}
                      style={{
                        color:
                          '#888',
                        fontSize:
                          '0.8rem',
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {new Date(
                        incident.timestampMs,
                      ).toLocaleTimeString()}
                    </time>
                  </div>

                  {incident.categories
                    .length > 0 && (
                    <div
                      style={{
                        display:
                          'flex',
                        flexWrap:
                          'wrap',
                        gap:
                          '0.4rem',
                        marginTop:
                          '0.8rem',
                      }}
                    >
                      {incident.categories.map(
                        (
                          category,
                        ) => (
                          <span
                            key={
                              category
                            }
                            style={{
                              background:
                                '#303030',
                              padding:
                                '0.25rem 0.5rem',
                              borderRadius:
                                '4px',
                              color:
                                '#ddd',
                              fontSize:
                                '0.75rem',
                              textTransform:
                                'uppercase',
                            }}
                          >
                            {getCategoryLabel(
                              category,
                            )}
                          </span>
                        ),
                      )}
                    </div>
                  )}

                  <p
                    style={{
                      color:
                        '#f5f5f5',
                      lineHeight:
                        1.5,
                      margin:
                        '1rem 0 0.5rem',
                    }}
                  >
                    {summary}
                  </p>

                  {summary !==
                    incident.reasoningTrace && (
                    <div
                      style={{
                        marginTop:
                          '0.75rem',
                        padding:
                          '0.75rem',
                        background:
                          '#171717',
                        borderRadius:
                          '6px',
                      }}
                    >
                      <strong
                        style={{
                          display:
                            'block',
                          color:
                            '#aaa',
                          fontSize:
                            '0.75rem',
                          textTransform:
                            'uppercase',
                          marginBottom:
                            '0.35rem',
                        }}
                      >
                        AI reasoning
                      </strong>

                      <span
                        style={{
                          color:
                            '#ccc',
                          lineHeight:
                            1.45,
                        }}
                      >
                        {
                          incident.reasoningTrace
                        }
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        'repeat(2, minmax(0, 1fr))',
                      gap: '0.5rem',
                      marginTop:
                        '1rem',
                    }}
                  >
                    <div
                      style={{
                        background:
                          '#272727',
                        padding:
                          '0.65rem',
                        borderRadius:
                          '5px',
                      }}
                    >
                      <small
                        style={{
                          color:
                            '#999',
                        }}
                      >
                        Reports
                      </small>

                      <div>
                        {
                          incident.reportCount
                        }
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          '#272727',
                        padding:
                          '0.65rem',
                        borderRadius:
                          '5px',
                      }}
                    >
                      <small
                        style={{
                          color:
                            '#999',
                        }}
                      >
                        Confidence
                      </small>

                      <div>
                        {
                          incident.confidence
                        }
                        %
                      </div>
                    </div>
                  </div>

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
                      marginTop:
                        '1rem',
                      minHeight:
                        '44px',
                      border:
                        '1px solid #555',
                      borderRadius:
                        '5px',
                      background:
                        '#333',
                      color:
                        'white',
                      fontWeight:
                        700,
                      cursor:
                        'pointer',
                    }}
                  >
                    Review incident →
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