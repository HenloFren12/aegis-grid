export interface GateReading {
  gateId: string;
  currentCount: number;
  capacity: number;
  previousCount: number;
  secondsSinceLastReading: number;
  corridorWidthM?: number;
  isRaining?: boolean;
}

export interface GateRiskFeatures {
  gateId: string;
  densityPct: number;
  netFlowPerMin: number;
  timeToCriticalSec: number;
  ruleBasedLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export function computeGateRisk(reading: GateReading): GateRiskFeatures {
  const { gateId, currentCount, capacity, previousCount, secondsSinceLastReading } = reading;

  if (capacity <= 0) {
    throw new RangeError(`computeGateRisk: capacity must be positive, got ${capacity}`);
  }

  const densityPct = Math.min(100, Math.max(0, (currentCount / capacity) * 100));

  let netFlowPerMin = 0;
  if (secondsSinceLastReading > 0 && secondsSinceLastReading <= 60) {
    netFlowPerMin = ((currentCount - previousCount) / secondsSinceLastReading) * 60;
  }

  const remaining = capacity - currentCount;
  
  let timeToCriticalSec: number;
  if (remaining <= 0) {
    timeToCriticalSec = 0; // Fix: Gate is already at or past capacity
  } else {
    timeToCriticalSec = (netFlowPerMin > 0)
      ? (remaining / netFlowPerMin) * 60
      : Infinity; 
  }

  let ruleBasedLevel: GateRiskFeatures['ruleBasedLevel'] = 'LOW';
  if (densityPct >= 95) {
    ruleBasedLevel = 'CRITICAL';
  } else if (densityPct >= 80 || timeToCriticalSec < 300) {
    ruleBasedLevel = 'HIGH';
  } else if (densityPct >= 60 || timeToCriticalSec < 600) {
    ruleBasedLevel = 'MODERATE';
  }

  return { gateId, densityPct, netFlowPerMin, timeToCriticalSec, ruleBasedLevel };
}