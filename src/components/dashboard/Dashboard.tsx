import {
  useEffect,
  useState,
} from 'react';

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import {
  useNavigate,
} from 'react-router-dom';

import { db } from '../../config/firebase';

import {
  computeGateRisk,
} from '../../lib/computeGateRisk';

import VenueMap from './VenueMap';
import IncidentQueue from './IncidentQueue';
import GateRiskCard from './GateRiskCard';

interface GateViewModel {
  gateId: string;
  currentCount: number;
  capacity: number;
  previousCount: number;
  secondsSinceLastReading: number;
  densityPct: number;
  netFlowPerMin: number;
  timeToCriticalSec: number | null;
  ruleBasedLevel: string;
  riskLevel: string;
  narrative: string | null;
  recommendedGate: string | null;
  lastUpdatedMs: number;
}

interface IncidentViewModel {
  id: string;
  status: string;
  severity: number;
  centroid?: {
    lat: number;
    lng: number;
  };
  [key: string]: unknown;
}

const wait = (
  milliseconds: number,
) =>
  new Promise<void>((resolve) => {
    window.setTimeout(
      resolve,
      milliseconds,
    );
  });

async function writeGateReading(
  gateId: string,
  currentCount: number,
  previousCount: number,
  capacity = 1000,
  secondsSinceLastReading = 60,
) {
  const risk = computeGateRisk({
    gateId,
    currentCount,
    previousCount,
    capacity,
    secondsSinceLastReading,
  });

  await setDoc(
    doc(db, 'gates', gateId),

    {
      gateId,
      currentCount,
      previousCount,
      capacity,
      secondsSinceLastReading,

      densityPct:
        risk.densityPct,

      netFlowPerMin:
        risk.netFlowPerMin,

      timeToCriticalSec:
        Number.isFinite(
          risk.timeToCriticalSec,
        )
          ? risk.timeToCriticalSec
          : null,

      ruleBasedLevel:
        risk.ruleBasedLevel,

      riskLevel:
        risk.ruleBasedLevel,

      narrative:
        risk.ruleBasedLevel ===
        'LOW'
          ? 'Gate operating normally.'
          : 'Risk detected. Cross-gate reasoning pending.',

      recommendedGate: null,

      reasoningStatus:
        risk.ruleBasedLevel ===
        'LOW'
          ? 'not_required'
          : 'pending',

      lastUpdatedMs:
        Date.now(),

      dataSource:
        'crisis_simulator',
    },

    {
      merge: true,
    },
  );
}

export default function Dashboard() {
  const [gates, setGates] =
    useState<GateViewModel[]>(
      [],
    );

  const [
    incidents,
    setIncidents,
  ] = useState<
    IncidentViewModel[]
  >([]);

  const [
    isSimulating,
    setIsSimulating,
  ] = useState(false);

  const [
    simulationMessage,
    setSimulationMessage,
  ] = useState<string | null>(
    null,
  );

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeGates =
      onSnapshot(
        collection(
          db,
          'gates',
        ),

        (snapshot) => {
          setGates(
            snapshot.docs.map(
              (document) => ({
                gateId:
                  document.id,
                ...document.data(),
              }),
            ) as GateViewModel[],
          );
        },

        (error) => {
          console.error(
            'Gate synchronization failed:',
            error,
          );
        },
      );

    const activeIncidents =
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

    const unsubscribeIncidents =
      onSnapshot(
        activeIncidents,

        (snapshot) => {
          setIncidents(
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              }),
            ) as IncidentViewModel[],
          );
        },

        (error) => {
          console.error(
            'Incident synchronization failed:',
            error,
          );
        },
      );

    return () => {
      unsubscribeGates();
      unsubscribeIncidents();
    };
  }, []);

  const triggerCrisis =
    async () => {
      if (isSimulating) {
        return;
      }

      setIsSimulating(true);

      setSimulationMessage(
        'Crisis simulation started.',
      );

      try {
        /*
         * Establish four distinct gates.
         *
         * C becomes dangerous.
         * B appears safer but is rising quickly.
         * D remains the safer alternative.
         */
        await Promise.all([
          writeGateReading(
            'A',
            420,
            410,
          ),

          writeGateReading(
            'B',
            430,
            390,
          ),

          writeGateReading(
            'C',
            510,
            490,
          ),

          writeGateReading(
            'D',
            350,
            348,
          ),
        ]);

        setSimulationMessage(
          'Baseline gate telemetry loaded.',
        );

        await wait(1200);

        await Promise.all([
          writeGateReading(
            'B',
            540,
            430,
          ),

          writeGateReading(
            'C',
            640,
            510,
          ),

          writeGateReading(
            'D',
            360,
            350,
          ),
        ]);

        setSimulationMessage(
          'Gate C inflow accelerating. Gate B is also trending upward.',
        );

        await wait(1200);

        await Promise.all([
          writeGateReading(
            'B',
            690,
            540,
          ),

          writeGateReading(
            'C',
            790,
            640,
          ),

          writeGateReading(
            'D',
            365,
            360,
          ),
        ]);

        setSimulationMessage(
          'Foresight threshold crossed. Cross-gate reasoning requested.',
        );

        await wait(1200);

        await Promise.all([
          writeGateReading(
            'B',
            830,
            690,
          ),

          writeGateReading(
            'C',
            960,
            790,
          ),

          writeGateReading(
            'D',
            370,
            365,
          ),
        ]);

        /*
         * Incident evidence is deliberately
         * staggered so the jury can watch the
         * Fusion Queue evolve.
         */
        const reportsRef =
          collection(
            db,
            'reports',
          );

        const baseLat =
          40.7125;

        const baseLng =
          -74.0055;

        const firstTimestamp =
          Date.now();

        await addDoc(
          reportsRef,
          {
            category:
              'medical',

            text:
              'A person collapsed near Section 100 while the crowd was pushing forward.',

            lat: baseLat,

            lng: baseLng,

            timestampMs:
              firstTimestamp,

            source:
              'simulator',

            geofenceOk: true,
          },
        );

        setSimulationMessage(
          'Medical SOS received near Section 100.',
        );

        await wait(1000);

        await addDoc(
          reportsRef,
          {
            category:
              'security',

            text:
              'Heavy pushing and crowd pressure near Section 100. People may be trapped.',

            lat:
              baseLat +
              0.0001,

            lng:
              baseLng,

            timestampMs:
              firstTimestamp +
              1000,

            source:
              'simulator',

            geofenceOk: true,
          },
        );

        setSimulationMessage(
          'Second report received: security category, same operational area.',
        );

        await wait(1000);

        await addDoc(
          reportsRef,
          {
            category:
              'medical',

            text:
              'Urgent medical assistance required. Crowd compression reported near Section 100.',

            lat: baseLat,

            lng:
              baseLng -
              0.0001,

            timestampMs:
              firstTimestamp +
              2000,

            source:
              'simulator',

            geofenceOk: true,
          },
        );

        setSimulationMessage(
          'Three crisis signals injected. Watch the live Fusion Queue.',
        );
      } catch (error) {
        console.error(
          'Crisis simulation failed:',
          error,
        );

        setSimulationMessage(
          'Crisis simulation failed. Check the browser console and Firestore permissions.',
        );
      } finally {
        setIsSimulating(false);
      }
    };

  return (
    <main
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(0, 1fr) minmax(340px, 450px)',
        gap: '1.5rem',
        padding: '1.5rem',
        minHeight: '100vh',
        backgroundColor:
          '#121212',
        color: 'white',
        fontFamily:
          'system-ui',
        boxSizing:
          'border-box',
      }}
    >
      <section
        style={{
          display: 'flex',
          flexDirection:
            'column',
          gap: '1rem',
          minHeight:
            'calc(100vh - 3rem)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize:
                '1.8rem',
            }}
          >
            Aegis Command
            Center
          </h1>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={
                triggerCrisis
              }
              disabled={
                isSimulating
              }
              aria-busy={
                isSimulating
              }
              style={{
                background:
                  '#ff9800',
                color: '#111',
                padding:
                  '0.65rem 1rem',
                border: 'none',
                borderRadius:
                  '4px',
                cursor:
                  isSimulating
                    ? 'wait'
                    : 'pointer',
                fontWeight:
                  'bold',
              }}
            >
              {isSimulating
                ? 'Simulating…'
                : '⚠ Simulate Crisis'}
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/upload',
                )
              }
              style={{
                background:
                  '#333',
                color: 'white',
                padding:
                  '0.65rem 1rem',
                border:
                  '1px solid #555',
                borderRadius:
                  '4px',
                cursor:
                  'pointer',
              }}
            >
              Data Ingestion
            </button>

            <button
              type="button"
              onClick={() =>
                window.open(
                  '/sos',
                  '_blank',
                  'noopener,noreferrer',
                )
              }
              style={{
                background:
                  '#d32f2f',
                color: 'white',
                padding:
                  '0.65rem 1rem',
                border: 'none',
                borderRadius:
                  '4px',
                cursor:
                  'pointer',
                fontWeight:
                  'bold',
              }}
            >
              Test SOS Report
            </button>
          </div>
        </div>

        {simulationMessage && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding:
                '0.75rem 1rem',
              background:
                '#1e1e1e',
              border:
                '1px solid #444',
              borderRadius:
                '6px',
              color: '#ddd',
            }}
          >
            {simulationMessage}
          </div>
        )}

        <div
          style={{
            flexGrow: 1,
            minHeight:
              '500px',
            borderRadius:
              '8px',
            overflow:
              'hidden',
            border:
              '1px solid #333',
          }}
        >
          <VenueMap
            incidents={
              incidents
            }
          />
        </div>
      </section>

      <aside
        aria-label="Operational intelligence panels"
        style={{
          display: 'flex',
          flexDirection:
            'column',
          gap: '1.5rem',
          maxHeight:
            'calc(100vh - 3rem)',
          overflow: 'hidden',
        }}
      >
        <section
          aria-labelledby="gate-risk-heading"
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: '0.75rem',
            maxHeight: '48%',
          }}
        >
          <h2
            id="gate-risk-heading"
            style={{
              margin: 0,
              fontSize:
                '1.2rem',
              textTransform:
                'uppercase',
              letterSpacing:
                '1px',
              color: '#bbb',
            }}
          >
            Gate Risk
            Foresight
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection:
                'column',
              gap: '1rem',
              overflowY:
                'auto',
              paddingRight:
                '0.5rem',
            }}
          >
            {gates.length ===
            0 ? (
              <p
                style={{
                  color: '#aaa',
                  background:
                    '#1e1e1e',
                  padding:
                    '1rem',
                  borderRadius:
                    '4px',
                }}
              >
                Awaiting sensor
                telemetry…
              </p>
            ) : (
              gates
                .sort(
                  (
                    first,
                    second,
                  ) =>
                    second.densityPct -
                    first.densityPct,
                )
                .map((gate) => (
                  <GateRiskCard
                    key={
                      gate.gateId
                    }
                    gate={gate}
                  />
                ))
            )}
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            flexDirection:
              'column',
            flexGrow: 1,
            overflow: 'hidden',
          }}
        >
          <IncidentQueue />
        </div>
      </aside>
    </main>
  );
}