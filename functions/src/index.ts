import {
  onDocumentCreated,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';

import * as admin from 'firebase-admin';

import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

import {
  clusterReports,
  type IncidentCluster,
  type RawReport,
} from './lib/clusterReports';

import {
  computeGateRisk,
  type GateRiskFeatures,
} from './lib/computeGateRisk';

import {
  buildGateRiskPrompt,
  buildSeverityPrompt,
} from './lib/reasoningPromptBuilder';

admin.initializeApp();

const db = admin.firestore();

type ReportCategory =
  RawReport['category'];

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ?? '';

const GEMINI_MODEL =
  'gemini-1.5-flash';

const genAI =
  GEMINI_API_KEY.length > 0
    ? new GoogleGenerativeAI(
        GEMINI_API_KEY,
      )
    : null;

const REPORT_WINDOW_MS =
  90_000;

const CATEGORY_SEVERITY: Record<
  ReportCategory,
  number
> = {
  medical: 5,
  security: 4,
  lost_child: 4,
  other: 2,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function parseJsonResponse(
  rawText: string,
): Record<string, unknown> {
  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const parsed: unknown =
    JSON.parse(cleaned);

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      'AI response was not a JSON object.',
    );
  }

  return parsed as Record<
    string,
    unknown
  >;
}

function normalizeCategory(
  value: unknown,
): ReportCategory {
  if (
    value === 'medical' ||
    value === 'security' ||
    value === 'lost_child' ||
    value === 'other'
  ) {
    return value;
  }

  return 'other';
}

function normalizeSource(
  value: unknown,
): RawReport['source'] {
  if (value === 'staff') {
    return 'staff';
  }

  return 'fan';
}


function normalizeReport(
  documentId: string,
  data: FirebaseFirestore.DocumentData,
): RawReport | null {
  const lat =
    Number(data.lat);

  const lng =
    Number(data.lng);

  const timestampMs =
    Number(data.timestampMs);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(timestampMs)
  ) {
    return null;
  }

  return {
    id: documentId,

    category:
      normalizeCategory(
        data.category,
      ),

    lat,
    lng,

    text:
      typeof data.text === 'string'
        ? data.text
            .trim()
            .slice(0, 500)
        : '',

    source:
      normalizeSource(
        data.source,
      ),

    timestampMs,
  };
}

function getFallbackSeverity(
  reports: RawReport[],
): number {
  let highestSeverity = 1;

  for (const report of reports) {
    highestSeverity =
      Math.max(
        highestSeverity,
        CATEGORY_SEVERITY[
          report.category
        ],
      );
  }

  return highestSeverity;
}

function getFallbackConfidence(
  reportCount: number,
  categoryCount: number,
): number {
  const reportEvidence =
    Math.min(
      reportCount,
      4,
    ) * 10;

  const categoryEvidence =
    Math.min(
      categoryCount,
      3,
    ) * 5;

  return clamp(
    45 +
      reportEvidence +
      categoryEvidence,
    55,
    90,
  );
}

async function classifyIncident(
  cluster: IncidentCluster,
): Promise<{
  severity: number;
  confidence: number;
  isSingleEvent: boolean;
  reasoningTrace: string;
  reasoningSource:
    | 'gemini'
    | 'deterministic_fallback';
}> {
  const categories =
    Array.from(
      cluster.categories,
    );

  const fallbackSeverity =
    getFallbackSeverity(
      cluster.reports,
    );

  const fallbackConfidence =
    getFallbackConfidence(
      cluster.reports.length,
      categories.length,
    );

  const fallbackResult = {
    severity:
      fallbackSeverity,

    confidence:
      fallbackConfidence,

    isSingleEvent: true,

    reasoningTrace:
      cluster.reports.length === 1
        ? 'A single emergency report was received. The incident was created immediately and remains open for corroborating evidence.'
        : `${cluster.reports.length} spatially and temporally related reports were grouped as a probable shared incident pending operator review.`,

    reasoningSource:
      'deterministic_fallback' as const,
  };

  if (!genAI) {
    return fallbackResult;
  }

  try {
    const gateSnapshot =
      await db
        .collection('gates')
        .get();

    let nearbyGateDensity = 0;

    for (
      const gateDocument of
      gateSnapshot.docs
    ) {
      const density =
        Number(
          gateDocument.data()
            .densityPct,
        );

      if (
        Number.isFinite(density)
      ) {
        nearbyGateDensity =
          Math.max(
            nearbyGateDensity,
            density,
          );
      }
    }

    const prompt =
      buildSeverityPrompt(
        cluster,
        {
          nearbyGateDensity,
        },
      );

    const model =
      genAI.getGenerativeModel({
        model: GEMINI_MODEL,
      });

    const result =
      await model.generateContent(
        prompt,
      );

    const parsed =
      parseJsonResponse(
        result.response.text(),
      );

    const aiSeverity =
      Number(parsed.severity);

    const aiConfidence =
      Number(parsed.confidence);

    return {
      severity:
        Number.isFinite(
          aiSeverity,
        )
          ? clamp(
              Math.round(
                aiSeverity,
              ),
              1,
              5,
            )
          : fallbackSeverity,

      confidence:
        Number.isFinite(
          aiConfidence,
        )
          ? clamp(
              Math.round(
                aiConfidence,
              ),
              0,
              100,
            )
          : fallbackConfidence,

      isSingleEvent:
        typeof parsed.isSingleEvent ===
        'boolean'
          ? parsed.isSingleEvent
          : true,

      reasoningTrace:
        typeof parsed.reasoning ===
          'string' &&
        parsed.reasoning
          .trim()
          .length > 0
          ? parsed.reasoning.trim()
          : fallbackResult.reasoningTrace,

      reasoningSource:
        'gemini',
    };
  } catch (error) {
    console.error(
      '[AI_CLASSIFICATION_FALLBACK]',
      error,
    );

    return fallbackResult;
  }
}

/*
 * =====================================================
 * FUSION ENGINE
 * REPORT -> CLUSTER -> INCIDENT -> GENAI REASONING
 * =====================================================
 *
 * Important safety property:
 *
 * Gemini is enrichment, NOT a single point of failure.
 *
 * Every valid emergency report should still result in
 * an incident even when AI processing is unavailable.
 */

export const onReportCreate =
  onDocumentCreated(
    'reports/{reportId}',

    async (event) => {
      const snapshot =
        event.data;

      if (!snapshot) {
        console.error(
          '[REPORT_CREATE] Missing Firestore snapshot.',
        );

        return;
      }

      const newReport =
        normalizeReport(
          snapshot.id,
          snapshot.data(),
        );

      if (!newReport) {
        console.error(
          '[REPORT_REJECTED]',
          snapshot.id,
          'Invalid coordinates or timestampMs.',
        );

        return;
      }

      try {
        const windowStart =
          newReport.timestampMs -
          REPORT_WINDOW_MS;

        const windowEnd =
          newReport.timestampMs +
          REPORT_WINDOW_MS;

        /*
         * Only retrieve reports inside the
         * relevant temporal fusion window.
         *
         * This prevents scanning the entire
         * reports collection on every trigger.
         */
        const recentSnapshot =
          await db
            .collection('reports')
            .where(
              'timestampMs',
              '>=',
              windowStart,
            )
            .where(
              'timestampMs',
              '<=',
              windowEnd,
            )
            .get();

        const reports:
          RawReport[] = [];

        for (
          const document of
          recentSnapshot.docs
        ) {
          const normalized =
            normalizeReport(
              document.id,
              document.data(),
            );

          if (normalized) {
            reports.push(
              normalized,
            );
          }
        }

        /*
         * Defensive consistency guarantee.
         *
         * The triggering report must always
         * participate in fusion even if query
         * consistency or malformed historical
         * records cause unexpected results.
         */
        if (
          !reports.some(
            (report) =>
              report.id ===
              newReport.id,
          )
        ) {
          reports.push(
            newReport,
          );
        }

        /*
         * IMPORTANT:
         *
         * The actual clusterReports() contract
         * in functions/src/lib accepts:
         *
         * clusterReports(reports, windowMs)
         *
         * There is intentionally NO third
         * distance argument here.
         */
        const clusters =
          clusterReports(
            reports,
            REPORT_WINDOW_MS,
          );

        const activeCluster =
          clusters.find(
            (cluster) =>
              cluster.reports.some(
                (report) =>
                  report.id ===
                  newReport.id,
              ),
          );

        if (!activeCluster) {
          throw new Error(
            `No cluster generated for report ${newReport.id}.`,
          );
        }

        const sortedReports = [
          ...activeCluster.reports,
        ].sort(
          (first, second) =>
            first.timestampMs -
            second.timestampMs,
        );

        const earliestReport =
          sortedReports[0];

        if (!earliestReport) {
          throw new Error(
            'Active incident cluster contained no reports.',
          );
        }

        /*
         * Stable incident identity:
         *
         * All reports fused with the earliest
         * report resolve to the same incident ID.
         */
        const incidentId =
          `inc_${earliestReport.id}`;

        const classification =
          await classifyIncident(
            activeCluster,
          );

        await db
          .collection('incidents')
          .doc(incidentId)
          .set(
            {
              id:
                incidentId,

              severity:
                classification.severity,

              confidence:
                classification.confidence,

              isSingleEvent:
                classification.isSingleEvent,

              reasoningTrace:
                classification.reasoningTrace,

              reasoningSource:
                classification.reasoningSource,

              status:
                'open',

              assignedResponderId:
                null,

              centroid:
                activeCluster.centroid,

              categories:
                Array.from(
                  activeCluster.categories,
                ),

              reportIds:
                sortedReports.map(
                  (report) =>
                    report.id,
                ),

              reportCount:
                sortedReports.length,

              reports:
                sortedReports,

              timestampMs:
                earliestReport.timestampMs,

              updatedAtMs:
                Date.now(),
            },

            {
              merge: true,
            },
          );

        console.log(
          '[INCIDENT_UPSERTED]',
          incidentId,
          `reports=${sortedReports.length}`,
          `severity=${classification.severity}`,
          `reasoning=${classification.reasoningSource}`,
        );
      } catch (error) {
        console.error(
          '[REPORT_PIPELINE_ERROR]',
          newReport.id,
          error,
        );

        /*
         * Last-resort deterministic fallback.
         *
         * A valid emergency report must never
         * silently disappear because clustering
         * or GenAI processing failed.
         */
        const fallbackIncidentId =
          `inc_${newReport.id}`;

        await db
          .collection('incidents')
          .doc(
            fallbackIncidentId,
          )
          .set(
            {
              id:
                fallbackIncidentId,

              severity:
                CATEGORY_SEVERITY[
                  newReport.category
                ],

              confidence:
                50,

              isSingleEvent:
                true,

              reasoningTrace:
                'Emergency report received. Automated fusion processing was unavailable, so a fallback incident was created for immediate operator review.',

              reasoningSource:
                'deterministic_fallback',

              status:
                'open',

              assignedResponderId:
                null,

              centroid: {
                lat:
                  newReport.lat,

                lng:
                  newReport.lng,
              },

              categories: [
                newReport.category,
              ],

              reportIds: [
                newReport.id,
              ],

              reportCount:
                1,

              reports: [
                newReport,
              ],

              timestampMs:
                newReport.timestampMs,

              updatedAtMs:
                Date.now(),
            },

            {
              merge: true,
            },
          );

        console.log(
          '[FALLBACK_INCIDENT_CREATED]',
          fallbackIncidentId,
        );
      }
    },
  );

/*
 * =====================================================
 * FORESIGHT ENGINE
 * RAW GATE READING -> DETERMINISTIC RISK -> GENAI
 * =====================================================
 *
 * onDocumentWritten is intentional.
 *
 * It handles both newly-created gates and updated gates.
 *
 * The rawInputChanged guard prevents recursive execution
 * when this function writes derived fields back into the
 * same Firestore document.
 */

export const onGateReadingWritten =
  onDocumentWritten(
    'gates/{gateId}',

    async (event) => {
      const change =
        event.data;

      if (!change) {
        return;
      }

      const afterSnapshot =
        change.after;

      /*
       * A deleted gate document does not
       * require risk processing.
       */
      if (
        !afterSnapshot.exists
      ) {
        return;
      }

      const after =
        afterSnapshot.data();

      if (!after) {
        return;
      }

      const before =
        change.before.exists
          ? change.before.data()
          : undefined;

      const isNewDocument =
        !change.before.exists;

      /*
       * CRITICAL RECURSION GUARD
       *
       * The Cloud Function writes fields such as:
       * densityPct, narrative, riskLevel, etc.
       *
       * Those writes trigger onDocumentWritten again.
       *
       * We continue only when one of the RAW sensor
       * inputs actually changed.
       */
      const rawInputChanged =
        isNewDocument ||
        before?.currentCount !==
          after.currentCount ||
        before?.capacity !==
          after.capacity ||
        before?.previousCount !==
          after.previousCount ||
        before
          ?.secondsSinceLastReading !==
          after.secondsSinceLastReading;

      if (!rawInputChanged) {
        return;
      }

      try {
        /*
         * Deterministic feature extraction happens
         * before GenAI.
         *
         * This means gate risk still works even if
         * Gemini is unavailable.
         */
        const riskFeatures =
          computeGateRisk({
            gateId:
              event.params.gateId,

            currentCount:
              Number(
                after.currentCount,
              ),

            capacity:
              Number(
                after.capacity,
              ),

            previousCount:
              Number(
                after.previousCount,
              ),

            secondsSinceLastReading:
              Number(
                after.secondsSinceLastReading,
              ),
          });

        let narrative =
          riskFeatures.ruleBasedLevel ===
          'LOW'
            ? 'Gate operating normally.'
            : 'Elevated crowd risk detected. Operator review recommended.';

        let recommendedGate:
          string | null =
          null;

        let reasoningStatus:
          | 'not_required'
          | 'complete'
          | 'unavailable' =
          riskFeatures.ruleBasedLevel ===
          'LOW'
            ? 'not_required'
            : 'unavailable';

        /*
         * Gemini is invoked only when deterministic
         * analysis determines that reasoning adds
         * operational value.
         */
        if (
          riskFeatures.ruleBasedLevel !==
            'LOW' &&
          genAI
        ) {
          try {
            const allGatesSnapshot =
              await db
                .collection('gates')
                .get();

            const allGateFeatures:
              GateRiskFeatures[] =
              [];

            for (
              const gateDocument of
              allGatesSnapshot.docs
            ) {
              const gateData =
                gateDocument.data();

              try {
                const features =
                  gateDocument.id ===
                  event.params.gateId
                    ? riskFeatures
                    : computeGateRisk({
                        gateId:
                          gateDocument.id,

                        currentCount:
                          Number(
                            gateData.currentCount,
                          ),

                        capacity:
                          Number(
                            gateData.capacity,
                          ),

                        previousCount:
                          Number(
                            gateData.previousCount,
                          ),

                        secondsSinceLastReading:
                          Number(
                            gateData.secondsSinceLastReading,
                          ),
                      });

                allGateFeatures.push(
                  features,
                );
              } catch (error) {
                /*
                 * One malformed gate must not
                 * destroy reasoning for every
                 * valid gate.
                 */
                console.error(
                  '[INVALID_GATE_SKIPPED]',
                  gateDocument.id,
                  error,
                );
              }
            }

            /*
             * Actual reasoningPromptBuilder
             * signature:
             *
             * buildGateRiskPrompt(
             *   allGateFeatures,
             *   context
             * )
             */
            const prompt =
              buildGateRiskPrompt(
                allGateFeatures,
                {
                  minutesToKickoff:
                    30,

                  isRaining:
                    false,
                },
              );

            const model =
              genAI.getGenerativeModel({
                model:
                  GEMINI_MODEL,
              });

            const result =
              await model.generateContent(
                prompt,
              );

            const parsed =
              parseJsonResponse(
                result.response.text(),
              );

            if (
              typeof parsed.narrative ===
                'string' &&
              parsed.narrative
                .trim()
                .length > 0
            ) {
              narrative =
                parsed.narrative.trim();
            }

            if (
              typeof parsed.recommendedGate ===
                'string' &&
              parsed.recommendedGate
                .trim()
                .length > 0
            ) {
              recommendedGate =
                parsed.recommendedGate.trim();
            }

            reasoningStatus =
              'complete';
          } catch (error) {
            console.error(
              '[GATE_AI_FALLBACK]',
              event.params.gateId,
              error,
            );

            /*
             * Deterministic risk remains available
             * even though GenAI enrichment failed.
             */
            reasoningStatus =
              'unavailable';
          }
        }

        /*
         * Firestore cannot store Infinity.
         */
        const safeTimeToCritical =
          Number.isFinite(
            riskFeatures.timeToCriticalSec,
          )
            ? riskFeatures.timeToCriticalSec
            : null;

        await afterSnapshot.ref.set(
          {
            gateId:
              event.params.gateId,

            densityPct:
              riskFeatures.densityPct,

            netFlowPerMin:
              riskFeatures.netFlowPerMin,

            timeToCriticalSec:
              safeTimeToCritical,

            ruleBasedLevel:
              riskFeatures.ruleBasedLevel,

            /*
             * Canonical dashboard-facing field.
             */
            riskLevel:
              riskFeatures.ruleBasedLevel,

            narrative,

            recommendedGate,

            reasoningStatus,

            /*
             * Clear any historical processing
             * error after a successful run.
             */
            processingError:
              null,

            lastUpdatedMs:
              Date.now(),
          },

          {
            merge: true,
          },
        );

        console.log(
          '[GATE_PROCESSED]',
          event.params.gateId,
          `density=${riskFeatures.densityPct}`,
          `risk=${riskFeatures.ruleBasedLevel}`,
          `reasoning=${reasoningStatus}`,
        );
      } catch (error) {
        console.error(
          '[GATE_PIPELINE_ERROR]',
          event.params.gateId,
          error,
        );

        /*
         * Persist processing state so the UI or
         * audit tooling can expose pipeline failure
         * rather than silently displaying stale data.
         */
        await afterSnapshot.ref.set(
          {
            reasoningStatus:
              'unavailable',

            processingError:
              error instanceof Error
                ? error.message
                : 'Gate reading could not be processed.',

            lastUpdatedMs:
              Date.now(),
          },

          {
            merge: true,
          },
        );
      }
    },
  );