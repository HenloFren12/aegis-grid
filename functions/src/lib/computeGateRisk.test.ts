import { computeGateRisk } from './computeGateRisk';

describe('computeGateRisk', () => {
  it('returns 0 for timeToCriticalSec when gate is already at or over capacity', () => {
    const result = computeGateRisk({ gateId: 'A', currentCount: 1050, capacity: 1000, previousCount: 1000, secondsSinceLastReading: 30 });
    expect(result.timeToCriticalSec).toBe(0);
    expect(result.densityPct).toBe(100);
    expect(result.ruleBasedLevel).toBe('CRITICAL');
  });

  it('returns CRITICAL when density is at or above 95%', () => {
    const result = computeGateRisk({ gateId: 'A', currentCount: 950, capacity: 1000, previousCount: 900, secondsSinceLastReading: 30 });
    expect(result.ruleBasedLevel).toBe('CRITICAL');
  });

  it('returns Infinity timeToCriticalSec when flow is flat', () => {
    const result = computeGateRisk({ gateId: 'A', currentCount: 500, capacity: 1000, previousCount: 500, secondsSinceLastReading: 30 });
    expect(result.timeToCriticalSec).toBe(Infinity);
  });

  it('returns Infinity timeToCriticalSec when flow is negative (gate emptying)', () => {
    const result = computeGateRisk({ gateId: 'A', currentCount: 400, capacity: 1000, previousCount: 500, secondsSinceLastReading: 30 });
    expect(result.timeToCriticalSec).toBe(Infinity);
  });

  it('throws a RangeError when capacity is zero or negative', () => {
    expect(() => computeGateRisk({ gateId: 'A', currentCount: 10, capacity: 0, previousCount: 0, secondsSinceLastReading: 30 }))
      .toThrow(RangeError);
  });

  it('does not divide by zero when secondsSinceLastReading is 0', () => {
    const result = computeGateRisk({ gateId: 'A', currentCount: 500, capacity: 1000, previousCount: 480, secondsSinceLastReading: 0 });
    expect(result.netFlowPerMin).toBe(0);
  });

  it('clamps densityPct at 100 even if currentCount exceeds capacity (sensor overcount)', () => {
    const result = computeGateRisk({ gateId: 'A', currentCount: 1100, capacity: 1000, previousCount: 1000, secondsSinceLastReading: 30 });
    expect(result.densityPct).toBe(100);
  });

  it('ignores readings older than 60s to prevent stale data from distorting trends', () => {
    const result = computeGateRisk({ gateId: 'A', currentCount: 600, capacity: 1000, previousCount: 200, secondsSinceLastReading: 120 });
    expect(result.netFlowPerMin).toBe(0);
    expect(result.timeToCriticalSec).toBe(Infinity);
  });
});