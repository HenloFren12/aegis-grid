import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger"; // <-- We import the official logger here

admin.initializeApp();
const db = admin.firestore();

export const onReportCreate = onDocumentCreated("reports/{reportId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("No snapshot data available."); // <-- ESLint loves this
    return;
  }

  const reportData = snapshot.data();
  if (!reportData) {
    logger.error("Snapshot data is empty."); 
    return;
  }

  const reportId = event.params.reportId;
  logger.info(`New report detected: ${reportId}. Processing into incident queue...`); 

  // Safely extract properties with default fallbacks
  const category = (reportData.category as string) || "other";
  const lat = (reportData.lat as number) || 0;
  const lng = (reportData.lng as number) || 0;

  const incidentRef = db.collection("incidents").doc(`inc_${reportId}`);
  
  const incidentPayload = {
    id: incidentRef.id,
    severity: category === "medical" || category === "security" ? 3 : 1,
    confidence: 100,
    isSingleEvent: true,
    reasoningTrace: `System automatically generated incident from fan report in category: ${category}`,
    status: "open",
    assignedResponderId: null,
    centroid: { lat, lng },
    ageSec: 0,
    timestampMs: Date.now()
  };

  // Write to the incidents collection
  await incidentRef.set(incidentPayload);
  
  // Write trace to the Audit Log
  await db.collection("auditLog").add({
    timestampMs: Date.now(),
    action: "INCIDENT_CREATED",
    payload: { incidentId: incidentRef.id, sourceReportId: reportId }
  });

  logger.info(`Incident ${incidentRef.id} successfully generated and logged.`);
});