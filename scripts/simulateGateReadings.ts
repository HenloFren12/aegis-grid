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
    'Missing VITE_FIREBASE_API_KEY in the root .env file.',
  );
}

if (!projectId) {
  throw new Error(
    'Missing VITE_FIREBASE_PROJECT_ID in the root .env file.',
  );
}

const app =
  initializeApp({
    apiKey,
    projectId,
  });

const db =
  getFirestore(app);

const GATE_IDS = [
  'A',
  'B',
  'C',
  'D',
] as const;

const CAPACITY = 1000;

const UPDATE_INTERVAL_MS =
  5000;

const counts: Record<
  (typeof GATE_IDS)[number],
  number
> = {
  A: 200,
  B: 300,
  C: 400,
  D: 250,
};

async function updateGate(
  gateId:
    (typeof GATE_IDS)[number],
): Promise<void> {
  const previousCount =
    counts[gateId];

  /*
   * Mostly positive flow with occasional
   * decreases to simulate realistic movement.
   */
  const randomDelta =
    Math.floor(
      Math.random() * 71,
    ) - 15;

  const currentCount =
    Math.max(
      0,
      previousCount +
        randomDelta,
    );

  counts[gateId] =
    currentCount;

  const reading = {
    gateId,

    currentCount,

    capacity:
      CAPACITY,

    previousCount,

    secondsSinceLastReading:
      UPDATE_INTERVAL_MS /
      1000,
  };

  const risk =
    computeGateRisk(
      reading,
    );

  await setDoc(
    doc(
      db,
      'gates',
      gateId,
    ),

    {
      ...reading,

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
    [
      `Gate ${gateId}`,
      `${risk.densityPct.toFixed(1)}%`,
      risk.ruleBasedLevel,
      `count=${currentCount}/${CAPACITY}`,
    ].join(' | '),
  );
}

async function simulatorTick(): Promise<void> {
  try {
    await Promise.all(
      GATE_IDS.map(
        (gateId) =>
          updateGate(
            gateId,
          ),
      ),
    );

    console.log(
      `[${new Date().toISOString()}] Simulator tick completed.`,
    );
  } catch (error) {
    console.error(
      '[SIMULATOR_ERROR]',
      error,
    );
  }
}

console.log(
  'Aegis Grid gate simulator started.',
);

console.log(
  `Updating gates every ${
    UPDATE_INTERVAL_MS /
    1000
  } seconds. Press Ctrl+C to stop.`,
);

void simulatorTick();

const interval =
  setInterval(
    () => {
      void simulatorTick();
    },

    UPDATE_INTERVAL_MS,
  );

function shutdown(): void {
  console.log(
    '\nStopping Aegis Grid gate simulator...',
  );

  clearInterval(
    interval,
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