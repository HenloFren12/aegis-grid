export interface GateReading {
  gateId: string;
  currentCount: number;
  capacity: number;
  previousCount: number;
  secondsSinceLastReading: number;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface GateRiskFeatures {
  gateId: string;
  densityPct: number;
  netFlowPerMin: number;
  timeToCriticalSec: number;
  ruleBasedLevel: RiskLevel;
}

export function computeGateRisk(
  reading: GateReading
): GateRiskFeatures {
  const {
    gateId,
    currentCount,
    capacity,
    previousCount,
    secondsSinceLastReading,
  } = reading;

  if (!gateId.trim()) {
    throw new TypeError('gateId is required');
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new RangeError('capacity must be a positive number');
  }

  if (!Number.isFinite(currentCount) || currentCount < 0) {
    throw new RangeError('currentCount must be >= 0');
  }

  if (!Number.isFinite(previousCount) || previousCount < 0) {
    throw new RangeError('previousCount must be >= 0');
  }

  const rawDensityPct = (currentCount / capacity) * 100;
  const densityPct = Math.min(100, Math.max(0, rawDensityPct));

  const netFlowPerMin =
    secondsSinceLastReading > 0
      ? ((currentCount - previousCount) /
          secondsSinceLastReading) *
        60
      : 0;

  const remainingCapacity = Math.max(0, capacity - currentCount);

  const timeToCriticalSec =
    remainingCapacity === 0
      ? 0
      : netFlowPerMin > 0
        ? (remainingCapacity / netFlowPerMin) * 60
        : Infinity;

  let ruleBasedLevel: RiskLevel = 'LOW';

  if (rawDensityPct >= 95) {
    ruleBasedLevel = 'CRITICAL';
  } else if (
    rawDensityPct >= 80 ||
    timeToCriticalSec < 300
  ) {
    ruleBasedLevel = 'HIGH';
  } else if (
    rawDensityPct >= 60 ||
    timeToCriticalSec < 600
  ) {
    ruleBasedLevel = 'MODERATE';
  }

  return {
    gateId,
    densityPct,
    netFlowPerMin,
    timeToCriticalSec,
    ruleBasedLevel,
  };
}