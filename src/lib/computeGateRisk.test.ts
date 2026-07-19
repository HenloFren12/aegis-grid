import { describe, expect, it } from 'vitest';
import {
  computeGateRisk,
  type GateReading,
} from './computeGateRisk';

function reading(
  overrides: Partial<GateReading> = {},
): GateReading {
  return {
    gateId: 'A',
    currentCount: 400,
    capacity: 1000,
    previousCount: 400,
    secondsSinceLastReading: 60,
    ...overrides,
  };
}

describe('computeGateRisk', () => {
  it('classifies low-risk conditions', () => {
    const result = computeGateRisk(reading());

    expect(result.gateId).toBe('A');
    expect(result.densityPct).toBe(40);
    expect(result.netFlowPerMin).toBe(0);
    expect(result.timeToCriticalSec).toBe(Infinity);
    expect(result.ruleBasedLevel).toBe('LOW');
  });

  it('classifies 60 percent density as MODERATE', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 600,
        previousCount: 600,
      }),
    );

    expect(result.densityPct).toBe(60);
    expect(result.ruleBasedLevel).toBe('MODERATE');
  });

  it('classifies 80 percent density as HIGH', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 800,
        previousCount: 800,
      }),
    );

    expect(result.densityPct).toBe(80);
    expect(result.ruleBasedLevel).toBe('HIGH');
  });

  it('classifies 95 percent density as CRITICAL', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 950,
        previousCount: 950,
      }),
    );

    expect(result.densityPct).toBe(95);
    expect(result.ruleBasedLevel).toBe('CRITICAL');
  });

  it('calculates positive crowd flow per minute', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 500,
        previousCount: 400,
        secondsSinceLastReading: 60,
      }),
    );

    expect(result.netFlowPerMin).toBe(100);
  });

  it('calculates negative crowd flow per minute', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 300,
        previousCount: 400,
        secondsSinceLastReading: 60,
      }),
    );

    expect(result.netFlowPerMin).toBe(-100);
  });

  it('uses zero flow when elapsed time is zero', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 500,
        previousCount: 400,
        secondsSinceLastReading: 0,
      }),
    );

    expect(result.netFlowPerMin).toBe(0);
    expect(result.timeToCriticalSec).toBe(Infinity);
  });

  it('calculates time to full capacity during positive inflow', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 500,
        previousCount: 400,
        capacity: 1000,
        secondsSinceLastReading: 60,
      }),
    );

    expect(result.timeToCriticalSec).toBe(300);
  });

  it('sets time to critical to zero at full capacity', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 1000,
        previousCount: 1000,
      }),
    );

    expect(result.timeToCriticalSec).toBe(0);
    expect(result.ruleBasedLevel).toBe('CRITICAL');
  });

  it('clamps displayed density to 100 percent', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 1200,
        capacity: 1000,
        previousCount: 1100,
      }),
    );

    expect(result.densityPct).toBe(100);
    expect(result.ruleBasedLevel).toBe('CRITICAL');
  });

  it('escalates to HIGH when time to critical is under 5 minutes', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 500,
        capacity: 1000,
        previousCount: 390,
        secondsSinceLastReading: 60,
      }),
    );

    expect(result.densityPct).toBe(50);
    expect(result.timeToCriticalSec).toBeLessThan(300);
    expect(result.ruleBasedLevel).toBe('HIGH');
  });

  it('escalates to MODERATE when time to critical is under 10 minutes', () => {
    const result = computeGateRisk(
      reading({
        currentCount: 500,
        capacity: 1000,
        previousCount: 440,
        secondsSinceLastReading: 60,
      }),
    );

    expect(result.densityPct).toBe(50);
    expect(result.timeToCriticalSec).toBeGreaterThanOrEqual(300);
    expect(result.timeToCriticalSec).toBeLessThan(600);
    expect(result.ruleBasedLevel).toBe('MODERATE');
  });

  it('rejects an empty gate ID', () => {
    expect(() =>
      computeGateRisk(
        reading({ gateId: '   ' }),
      ),
    ).toThrow(TypeError);
  });

  it('rejects zero capacity', () => {
    expect(() =>
      computeGateRisk(
        reading({ capacity: 0 }),
      ),
    ).toThrow(RangeError);
  });

  it('rejects negative capacity', () => {
    expect(() =>
      computeGateRisk(
        reading({ capacity: -1 }),
      ),
    ).toThrow(RangeError);
  });

  it('rejects non-finite capacity', () => {
    expect(() =>
      computeGateRisk(
        reading({ capacity: Number.NaN }),
      ),
    ).toThrow(RangeError);
  });

  it('rejects negative current crowd count', () => {
    expect(() =>
      computeGateRisk(
        reading({ currentCount: -1 }),
      ),
    ).toThrow(RangeError);
  });

  it('rejects negative previous crowd count', () => {
    expect(() =>
      computeGateRisk(
        reading({ previousCount: -1 }),
      ),
    ).toThrow(RangeError);
  });
});