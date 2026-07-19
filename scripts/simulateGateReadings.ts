import {
  initializeApp,
} from 'firebase/app';

import {
  doc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';

import * as dotenv from 'dotenv';

import {
  computeGateRisk,
} from '../src/lib/computeGateRisk';

dotenv.config();

const apiKey =
  process.env
    .VITE_FIREBASE_API_KEY;

const projectId =
  process.env
    .VITE_FIREBASE_PROJECT_ID;

if (!apiKey) {
  throw new Error(
    'Missing VITE_FIREBASE_API_KEY.',
  );
}

if (!projectId) {
  throw new Error(
    'Missing VITE_FIREBASE_PROJECT_ID.',
  );
}

const app =
  initializeApp({
    apiKey,
    projectId,
  });

const db =
  getFirestore(app);

const GATES = [
  {
    id: 'A',
    name:
      'Gate A — North Entrance',
  },

  {
    id: 'B',
    name:
      'Gate B — South Entrance',
  },

  {
    id: 'C',
    name:
      'Gate C — East Entrance',
  },

  {
    id: 'D',
    name:
      'Gate D — West Entrance',
  },
] as const;

type GateId =
  (typeof GATES)[number]['id'];

const CAPACITY = 1000;

const INTERVAL_MS = 5000;

const counts: Record<
  GateId,
  number
> = {
  A: 220,
  B: 320,
  C: 430,
  D: 260,
};

async function updateGate(
  gate: (typeof GATES)[number],
): Promise<void> {
  const previousCount =
    counts[gate.id];

  const delta =
    Math.floor(
      Math.random() * 71,
    ) - 15;

  const currentCount =
    Math.max(
      0,
      previousCount +
        delta,
    );

  counts[gate.id] =
    currentCount;

  const reading = {
    gateId: gate.id,
    currentCount,
    capacity: CAPACITY,
    previousCount,
    secondsSinceLastReading:
      INTERVAL_MS / 1000,
  };

  const risk =
    computeGateRisk(
      reading,
    );

  /*
   * Stable document ID means every tick
   * UPDATES gates/A, gates/B, gates/C,
   * and gates/D.
   *
   * It never creates alternative gate
   * identities.
   */
  await setDoc(
    doc(
      db,
      'gates',
      gate.id,
    ),

    {
      ...reading,

      gateName:
        gate.name,

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
          : 'Risk detected. Contextual reasoning pending.',

      recommendedGate:
        null,

      reasoningStatus:
        risk.ruleBasedLevel ===
        'LOW'
          ? 'not_required'
          : 'pending',

      lastUpdatedMs:
        Date.now(),

      dataSource:
        'live_simulator',
    },

    {
      merge: true,
    },
  );

  console.log(
    `${gate.id} | ${gate.name} | ${risk.densityPct.toFixed(
      1,
    )}% | ${risk.ruleBasedLevel}`,
  );
}

async function tick(): Promise<void> {
  try {
    await Promise.all(
      GATES.map(
        updateGate,
      ),
    );

    console.log(
      `[${new Date().toISOString()}] Updated exactly four canonical gates.`,
    );
  } catch (error) {
    console.error(
      '[SIMULATOR_ERROR]',
      error,
    );
  }
}

console.log(
  'Aegis Grid simulator started.',
);

void tick();

const interval =
  setInterval(
    () => {
      void tick();
    },
    INTERVAL_MS,
  );

function shutdown(): void {
  clearInterval(interval);

  console.log(
    'Aegis Grid simulator stopped.',
  );

  process.exit(0);
}

process.on(
  'SIGINT',
  shutdown,
);

process.on(
  'SIGTERM',
  shutdown,
);