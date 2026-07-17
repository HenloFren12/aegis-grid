// src/lib/reasoningPromptBuilder.ts

export interface GateRiskFeatures {
  gateId: string;
  densityPct: number;
  netFlowPerMin: number;
  timeToCriticalSec: number;
  ruleBasedLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface RawReport {
  id: string;
  category: 'medical' | 'security' | 'lost_child' | 'other';
  lat: number;
  lng: number;
  text: string;
  source: 'fan' | 'staff';
  timestampMs: number;
}

export interface IncidentCluster {
  incidentId: string;
  reports: RawReport[];
  centroid: { lat: number; lng: number };
  categories: Set<RawReport['category']>;
}

/**
 * PILLAR 1: Cross-Gate Predictive Reasoning
 * We pass all gates to the model so it can compare paths and avoid routing
 * people into a gate that is currently empty but trending towards failure.
 */
export function buildGateRiskPrompt(
  allGateFeatures: GateRiskFeatures[],
  context: { minutesToKickoff: number; isRaining: boolean }
): string {
  const flagged = allGateFeatures.filter(g => g.ruleBasedLevel !== 'LOW');
  
  return `
You are a stadium safety reasoning assistant. Given the structured gate data below,
identify which gates need operator attention NOW, and for each one recommend a
specific alternative gate — but only if that alternative is not itself trending
toward the same problem. Respond in strict JSON matching the provided schema.

CONTEXT: ${context.minutesToKickoff} minutes to kickoff, raining: ${context.isRaining}
ALL GATES: ${JSON.stringify(allGateFeatures)}
FLAGGED GATES: ${JSON.stringify(flagged)}

REQUIRED JSON SCHEMA:
{
  "gateId": "string",
  "riskLevel": "string",
  "narrative": "string (Explain WHY this alternative gate is safer based on the data)",
  "recommendedGate": "string",
  "confidence": "number (0.0 to 1.0)"
}
`.trim();
}

/**
 * PILLAR 2: Multi-Signal Incident Fusion
 * We pass clustered reports to the model. If a medical and security report happen
 * in the same spot, the AI decides if they are the same cascading event.
 */
export function buildSeverityPrompt(
  cluster: IncidentCluster, 
  crowdContext: { nearbyGateDensity: number }
): string {
  // Convert the Set to an Array for JSON serialization
  const serializedReports = cluster.reports.map(r => ({
    category: r.category,
    text: r.text,
    source: r.source
  }));

  return `
Classify the severity of this incident on a 1-5 scale (5 = life-threatening,
requires immediate dispatch). Consider the report text, category mix, number
of independent reports, and nearby crowd density. If the cluster contains more
than one category, decide whether the reports describe ONE event or TWO, and
say so explicitly. 

REPORTS: ${JSON.stringify(serializedReports)}
NEARBY GATE DENSITY: ${crowdContext.nearbyGateDensity}%

Respond in strict JSON matching this schema: 
{ 
  "severity": "number (1-5)", 
  "confidence": "number (0-100)", 
  "isSingleEvent": "boolean", 
  "reasoning": "string (Explain your severity and single-event logic)" 
}
`.trim();
}