import { useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import Papa from 'papaparse';

import { db } from '../../config/firebase';
import { computeGateRisk } from '../../lib/computeGateRisk';

interface ExpectedCSVRow {
  gateId: string;
  currentCount: string;
  capacity: string;
  previousCount: string;
  secondsSinceLastReading: string;
}

interface ValidatedGateRow {
  gateId: string;
  currentCount: number;
  capacity: number;
  previousCount: number;
  secondsSinceLastReading: number;
}

function parseRequiredNumber(
  value: string | undefined,
  fieldName: string,
  rowNumber: number,
): number {
  if (
    value === undefined ||
    value === null ||
    value.trim() === ''
  ) {
    throw new Error(
      `Row ${rowNumber}: missing required value "${fieldName}".`,
    );
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Row ${rowNumber}: "${fieldName}" must be a valid number.`,
    );
  }

  return parsed;
}

function validateRow(
  row: ExpectedCSVRow,
  rowNumber: number,
): ValidatedGateRow {
  const gateId = row.gateId?.trim();

  if (!gateId) {
    throw new Error(
      `Row ${rowNumber}: missing required value "gateId".`,
    );
  }

  const currentCount = parseRequiredNumber(
    row.currentCount,
    'currentCount',
    rowNumber,
  );

  const capacity = parseRequiredNumber(
    row.capacity,
    'capacity',
    rowNumber,
  );

  const previousCount = parseRequiredNumber(
    row.previousCount,
    'previousCount',
    rowNumber,
  );

  const secondsSinceLastReading = parseRequiredNumber(
    row.secondsSinceLastReading,
    'secondsSinceLastReading',
    rowNumber,
  );

  if (currentCount < 0) {
    throw new Error(
      `Row ${rowNumber}: "currentCount" cannot be negative.`,
    );
  }

  if (capacity <= 0) {
    throw new Error(
      `Row ${rowNumber}: "capacity" must be greater than 0.`,
    );
  }

  if (previousCount < 0) {
    throw new Error(
      `Row ${rowNumber}: "previousCount" cannot be negative.`,
    );
  }

  if (secondsSinceLastReading < 0) {
    throw new Error(
      `Row ${rowNumber}: "secondsSinceLastReading" cannot be negative.`,
    );
  }

  return {
    gateId,
    currentCount,
    capacity,
    previousCount,
    secondsSinceLastReading,
  };
}

export default function DataUploadPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLogs((previousLogs) => [
      message,
      ...previousLogs,
    ]);
  };

  const processFile = (file: File) => {
    setIsProcessing(true);

    addLog(
      `[SYSTEM] Initiating parse for: ${file.name}`,
    );

    Papa.parse<ExpectedCSVRow>(file, {
      header: true,
      skipEmptyLines: true,

      complete: async (results) => {
        try {
          if (results.errors.length > 0) {
            results.errors.forEach((error) => {
              addLog(
                `[PARSE WARNING] Row ${
                  error.row !== undefined
                    ? error.row + 1
                    : 'unknown'
                }: ${error.message}`,
              );
            });
          }

          const requiredHeaders = [
            'gateId',
            'currentCount',
            'capacity',
            'previousCount',
            'secondsSinceLastReading',
          ];

          const actualHeaders =
            results.meta.fields ?? [];

          const missingHeaders =
            requiredHeaders.filter(
              (header) =>
                !actualHeaders.includes(header),
            );

          if (missingHeaders.length > 0) {
            addLog(
              `[FATAL ERROR] Missing required CSV headers: ${missingHeaders.join(
                ', ',
              )}`,
            );

            return;
          }

          addLog(
            `[SUCCESS] Parsed ${results.data.length} rows. Validating schema and computing gate risk...`,
          );

          let successCount = 0;
          let errorCount = 0;

          for (
            let index = 0;
            index < results.data.length;
            index += 1
          ) {
            const row = results.data[index];
            const rowNumber = index + 1;

            try {
              const validated =
                validateRow(row, rowNumber);

              /*
               * Deterministic feature extraction happens
               * immediately during ingestion.
               *
               * This guarantees that uploaded jury data
               * produces usable risk information even before
               * any asynchronous GenAI reasoning completes.
               */
              const risk = computeGateRisk({
                gateId: validated.gateId,
                currentCount:
                  validated.currentCount,
                capacity: validated.capacity,
                previousCount:
                  validated.previousCount,
                secondsSinceLastReading:
                  validated.secondsSinceLastReading,
              });

              /*
               * Firestore cannot store Infinity.
               *
               * null means the gate is not currently trending
               * toward capacity, so there is no finite
               * time-to-critical value.
               */
              const timeToCriticalSec =
                Number.isFinite(
                  risk.timeToCriticalSec,
                )
                  ? risk.timeToCriticalSec
                  : null;

              const gateDocument = {
                gateId: validated.gateId,

                // Raw gate reading
                currentCount:
                  validated.currentCount,
                capacity: validated.capacity,
                previousCount:
                  validated.previousCount,
                secondsSinceLastReading:
                  validated.secondsSinceLastReading,

                // Deterministic risk features
                densityPct: risk.densityPct,
                netFlowPerMin:
                  risk.netFlowPerMin,
                timeToCriticalSec,
                ruleBasedLevel:
                  risk.ruleBasedLevel,

                /*
                 * riskLevel is retained as the canonical
                 * dashboard-facing field.
                 *
                 * GenAI reasoning may later enrich the gate,
                 * but deterministic risk remains immediately
                 * available.
                 */
                riskLevel:
                  risk.ruleBasedLevel,

                // GenAI enrichment fields
                narrative: null,
                recommendedGate: null,

                reasoningStatus:
                  risk.ruleBasedLevel === 'LOW'
                    ? 'not_required'
                    : 'pending',

                // Canonical timestamp field
                lastUpdatedMs: Date.now(),

                // Traceability for jury-uploaded data
                dataSource: 'csv_upload',
              };

              const gateRef = doc(
                db,
                'gates',
                validated.gateId,
              );

              await setDoc(
                gateRef,
                gateDocument,
                {
                  merge: true,
                },
              );

              successCount += 1;

              addLog(
                `[INGESTED] Gate ${
                  validated.gateId
                } → ${risk.densityPct.toFixed(
                  1,
                )}% → ${risk.ruleBasedLevel}`,
              );
            } catch (error: unknown) {
              errorCount += 1;

              const message =
                error instanceof Error
                  ? error.message
                  : 'Unknown row-processing error.';

              addLog(
                `[ROW ERROR] ${message}`,
              );
            }
          }

          addLog(
            `[COMPLETE] Ingestion finished. ${successCount} processed, ${errorCount} rejected.`,
          );
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unknown ingestion error.';

          addLog(
            `[FATAL ERROR] Ingestion failed: ${message}`,
          );
        } finally {
          setIsProcessing(false);
        }
      },

      error: (error) => {
        addLog(
          `[FATAL ERROR] CSV parsing failed: ${error.message}`,
        );

        setIsProcessing(false);
      },
    });
  };

  const handleUploadClick = () => {
    const file =
      fileInputRef.current?.files?.[0];

    if (!file) {
      addLog(
        '[WARNING] Please select a CSV file first.',
      );

      return;
    }

    processFile(file);
  };

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'system-ui',
        maxWidth: '800px',
        margin: '0 auto',
        color: 'white',
      }}
    >
      <h2>Stadium Data Ingestion Engine</h2>

      <p style={{ color: '#aaa' }}>
        Upload a CSV containing live gate readings.
        Valid rows are schema-validated, processed
        through the deterministic Foresight Engine,
        and written to Firestore for live dashboard
        updates and AI reasoning.
      </p>

      <div
        style={{
          background: '#1e1e1e',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileInputRef}
            disabled={isProcessing}
            aria-label="Select gate readings CSV file"
            style={{
              padding: '0.5rem',
              background: '#2a2a2a',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '4px',
              flexGrow: 1,
            }}
          />

          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isProcessing}
            aria-busy={isProcessing}
            style={{
              background: '#1976d2',
              color: 'white',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: isProcessing
                ? 'wait'
                : 'pointer',
            }}
          >
            {isProcessing
              ? 'Processing...'
              : 'UPLOAD & INGEST'}
          </button>
        </div>

        <div
          style={{
            marginTop: '1rem',
            fontSize: '0.85rem',
            color: '#888',
          }}
        >
          <strong>
            Required CSV Headers:
          </strong>{' '}
          gateId, currentCount, capacity,
          previousCount,
          secondsSinceLastReading
        </div>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Data ingestion log"
        style={{
          background: 'black',
          color: '#00ff00',
          padding: '1rem',
          borderRadius: '8px',
          height: '300px',
          overflowY: 'auto',
          fontFamily: 'monospace',
        }}
      >
        {logs.length === 0 ? (
          <p style={{ color: '#555' }}>
            System ready. Awaiting data
            payload...
          </p>
        ) : (
          logs.map((log, index) => (
            <div
              key={`${index}-${log}`}
              style={{
                marginBottom: '0.5rem',
              }}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}