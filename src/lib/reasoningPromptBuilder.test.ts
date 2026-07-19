import { describe, expect, it } from 'vitest';
import {
  buildGateRiskPrompt,
  buildSeverityPrompt,
  type GateRiskFeatures,
  type IncidentCluster,
} from './reasoningPromptBuilder';

describe('buildGateRiskPrompt', () => {
  const gates: GateRiskFeatures[] = [
    {
      gateId: 'A',
      densityPct: 96,
      netFlowPerMin: 20,
      timeToCriticalSec: 100,
      ruleBasedLevel: 'CRITICAL',
    },
    {
      gateId: 'B',
      densityPct: 82,
      netFlowPerMin: 10,
      timeToCriticalSec: 250,
      ruleBasedLevel: 'HIGH',
    },
    {
      gateId: 'C',
      densityPct: 40,
      netFlowPerMin: -5,
      timeToCriticalSec: Infinity,
      ruleBasedLevel: 'LOW',
    },
  ];

  it('includes all gates for cross-gate reasoning', () => {
    const prompt = buildGateRiskPrompt(gates, {
      minutesToKickoff: 30,
      isRaining: false,
    });

    expect(prompt).toContain('"gateId":"A"');
    expect(prompt).toContain('"gateId":"B"');
    expect(prompt).toContain('"gateId":"C"');
  });

  it('includes only non-LOW gates in the flagged section', () => {
    const prompt = buildGateRiskPrompt(gates, {
      minutesToKickoff: 30,
      isRaining: false,
    });

    const flaggedSection = prompt
      .split('FLAGGED GATES:')[1]
      .split('Return ONLY valid JSON')[0];

    expect(flaggedSection).toContain('"gateId":"A"');
    expect(flaggedSection).toContain('"gateId":"B"');
    expect(flaggedSection).not.toContain('"gateId":"C"');
  });

  it('requires a multi-gate array response contract', () => {
    const prompt = buildGateRiskPrompt(gates, {
      minutesToKickoff: 15,
      isRaining: true,
    });

    expect(prompt).toContain('"gates": [');
    expect(prompt).toContain('"overallSituation"');
    expect(prompt).toContain(
      'exactly one result for every gate supplied',
    );
  });

  it('includes operational context', () => {
    const prompt = buildGateRiskPrompt(gates, {
      minutesToKickoff: 12,
      isRaining: true,
    });

    expect(prompt).toContain('"minutesToKickoff":12');
    expect(prompt).toContain('"isRaining":true');
  });

  it('handles a venue with no flagged gates', () => {
    const prompt = buildGateRiskPrompt(
      [gates[2]],
      {
        minutesToKickoff: 60,
        isRaining: false,
      },
    );

    const flaggedSection = prompt
      .split('FLAGGED GATES:')[1]
      .split('Return ONLY valid JSON')[0];

    expect(flaggedSection).toContain('[]');
  });
});

describe('buildSeverityPrompt', () => {
  const cluster: IncidentCluster = {
    incidentId: 'incident-1',
    centroid: { lat: 19.1, lng: 72.8 },
    categories: new Set(['medical', 'security']),
    reports: [
      {
        id: 'report-1',
        category: 'medical',
        lat: 19.1,
        lng: 72.8,
        text: 'Person needs medical assistance',
        source: 'fan',
        timestampMs: 1000,
      },
      {
        id: 'report-2',
        category: 'security',
        lat: 19.1,
        lng: 72.8,
        text: 'Crowd pushing near the same location',
        source: 'staff',
        timestampMs: 1010,
      },
    ],
  };

  it('includes report evidence and nearby crowd density', () => {
    const prompt = buildSeverityPrompt(
      cluster,
      { nearbyGateDensity: 88 },
    );

    expect(prompt).toContain(
      'Person needs medical assistance',
    );
    expect(prompt).toContain(
      'Crowd pushing near the same location',
    );
    expect(prompt).toContain(
      'NEARBY GATE DENSITY: 88%',
    );
  });

  it('requires severity and incident-fusion reasoning', () => {
    const prompt = buildSeverityPrompt(
      cluster,
      { nearbyGateDensity: 70 },
    );

    expect(prompt).toContain('"severity"');
    expect(prompt).toContain('"confidence"');
    expect(prompt).toContain('"isSingleEvent"');
    expect(prompt).toContain('"reasoning"');
  });

  it('serializes only reasoning-relevant report fields', () => {
    const prompt = buildSeverityPrompt(
      cluster,
      { nearbyGateDensity: 50 },
    );

    expect(prompt).toContain('"category":"medical"');
    expect(prompt).toContain('"source":"fan"');

    expect(prompt).not.toContain('"timestampMs":1000');
    expect(prompt).not.toContain('"lat":19.1');
  });
});