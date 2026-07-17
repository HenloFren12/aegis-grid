import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Import your pure functions (Make sure you copied the lib folder into functions/src/lib!)
import { clusterReports } from "./lib/clusterReports";
import { computeGateRisk } from "./lib/computeGateRisk";
import { buildSeverityPrompt, buildGateRiskPrompt } from "./lib/reasoningPromptBuilder";

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini securely from backend environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const MODEL_NAME = "gemini-1.5-flash"; // Fixed to a valid, fast reasoning model

/**
 * P1 ITEM 6 & 8: The Fusion Engine (Incident Dedup & AI Severity)
 */
export const onReportCreate = onDocumentCreated("reports/{reportId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const newReport = snap.data() as any;

  // 1. Fetch recent reports (last 90 seconds) for clustering
  const windowMs = 90000;
  const recentQuery = await db.collection("reports")
    .where("timestampMs", ">=", newReport.timestampMs - windowMs)
    .get();
  
  const reports = recentQuery.docs.map(doc => doc.data() as any);
  
  // 2. Cluster the reports (O(n log n) deduplication)
  const clusters = clusterReports(reports, windowMs);
  
  // Find the cluster that contains the report that just triggered this function
  const activeCluster = clusters.find(c => 
    c.reports.some(r => r.id === newReport.id)
  );

  if (!activeCluster) return;

  // 3. AI Severity Classification & Disambiguation
  let severity = 1;
  let confidence = 50;
  let isSingleEvent = true;
  let reasoning = "System generated incident from rule-based fallback.";

  try {
    // We mock nearby density for the prompt context, but in production this could query the gates collection
    const prompt = buildSeverityPrompt(activeCluster, { nearbyGateDensity: 65 }); 
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    const result = await model.generateContent(prompt);
    const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const aiAnalysis = JSON.parse(cleanJson);

    severity = aiAnalysis.severity || severity;
    confidence = aiAnalysis.confidence || confidence;
    isSingleEvent = aiAnalysis.isSingleEvent ?? isSingleEvent;
    reasoning = aiAnalysis.reasoning || reasoning;
  } catch (error) {
    console.error("[FALLBACK TRIGGERED] AI Classification failed:", error);
  }

  // 4. Write the fused incident to the Priority Queue
  const incidentRef = db.collection("incidents").doc(activeCluster.incidentId);
  await incidentRef.set({
    id: activeCluster.incidentId,
    severity,
    confidence,
    isSingleEvent,
    reasoningTrace: reasoning,
    status: 'open',
    assignedResponderId: null,
    centroid: activeCluster.centroid,
    ageSec: 0,
    timestampMs: Date.now(),
    reports: activeCluster.reports 
  }, { merge: true });
});


/**
 * P1 ITEM 7: The Foresight Engine (Batched Cross-Gate Prompting)
 */
export const onGateReadingUpdate = onDocumentUpdated("gates/{gateId}", async (event) => {
  const after = event.data?.after.data();
  if (!after) return;
  
  // 1. Run pure O(1) deterministic feature extraction
  const riskFeatures = computeGateRisk(after as any);

  // 2. Cost-Control Guard: Only trigger AI if MODERATE, HIGH, or CRITICAL
  if (riskFeatures.ruleBasedLevel === 'LOW') {
     await event.data?.after.ref.update({
        ...riskFeatures,
        narrative: "Gate operating normally.",
        lastUpdated: Date.now()
     });
     return; // Escape early! No AI call needed.
  }

  // 3. If flagged, fetch ALL gates for cross-gate comparative reasoning
  const allGatesSnap = await db.collection("gates").get();
  const allGateFeatures = allGatesSnap.docs.map(doc => {
     const data = doc.data();
     if (data.gateId === riskFeatures.gateId) return riskFeatures; // Use fresh data for the active gate
     return computeGateRisk(data as any);
  });

  let narrative = "Warning: High density detected. Manual operator review required.";
  let recommendedGate = "";

  try {
    const prompt = buildGateRiskPrompt(allGateFeatures, { minutesToKickoff: 30, isRaining: false });
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    const result = await model.generateContent(prompt);
    const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const aiAnalysis = JSON.parse(cleanJson);
    
    narrative = aiAnalysis.narrative;
    recommendedGate = aiAnalysis.recommendedGate;
  } catch (error) {
    console.error("[FALLBACK TRIGGERED] AI Gate Risk failed:", error);
  }

  // 4. Write the GenAI narrative back to the gate document
  await event.data?.after.ref.update({
     ...riskFeatures,
     narrative,
     recommendedGate,
     lastUpdated: Date.now()
  });
});