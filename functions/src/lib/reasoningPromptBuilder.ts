export interface GateRiskFeatures {
  gateId: string;
  densityPct: number;
  netFlowPerMin: number;
  timeToCriticalSec: number;
  ruleBasedLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

export interface RawReport {
  id: string;
  category: "medical" | "security" | "lost_child" | "other";
  lat: number;
  lng: number;
  text: string;
  source: "fan" | "staff";
  timestampMs: number;
}

export interface IncidentCluster {
  incidentId: string;
  reports: RawReport[];
  centroid: { lat: number; lng: number };
  categories: Set<RawReport["category"]>;
}

/**
 * PILLAR 1: Cross-Gate Predictive Reasoning
 *
 * All gate features are supplied together so the model can compare
 * current risk and trend before recommending safer alternatives.
 * The response contract returns one result per flagged gate.
 */
export function buildGateRiskPrompt(
  allGateFeatures: GateRiskFeatures[],
  context: { minutesToKickoff: number; isRaining: boolean },
): string {
  const flagged = allGateFeatures.filter(
    (gate) => gate.ruleBasedLevel !== "LOW",
  );

  return `
You are a stadium safety reasoning assistant.

Analyze ALL gate conditions together and return reasoning for EVERY gate listed
in FLAGGED GATES.

For each flagged gate:
1. Explain why it requires operator attention using its density, crowd-flow trend,
   time-to-critical, and the wider venue state.
2. Recommend a safer alternative gate only after comparing ALL available gates.
3. Do not recommend a CRITICAL gate.
4. Avoid recommending another HIGH-risk gate when a safer LOW or MODERATE gate exists.
5. If no genuinely safer alternative exists, return null for recommendedGate.
6. Do not invent gates or operational facts not present in the supplied data.

CONTEXT:
${JSON.stringify(context)}

ALL GATES:
${JSON.stringify(allGateFeatures)}

FLAGGED GATES:
${JSON.stringify(flagged)}

Return ONLY valid JSON. Do not include markdown or explanatory text outside JSON.

REQUIRED JSON SCHEMA:
{
  "gates": [
    {
      "gateId": "string",
      "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
      "narrative": "string",
      "recommendedGate": "string or null",
      "confidence": "number from 0.0 to 1.0"
    }
  ],
  "overallSituation": "string"
}

The gates array must contain exactly one result for every gate supplied in
FLAGGED GATES. Every gateId must match a gateId from FLAGGED GATES.
`.trim();
}

/**
 * PILLAR 2: Multi-Signal Incident Fusion
 */
export function buildSeverityPrompt(
  cluster: IncidentCluster,
  crowdContext: { nearbyGateDensity: number },
): string {
  const serializedReports = cluster.reports.map((report) => ({
    category: report.category,
    text: report.text,
    source: report.source,
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
