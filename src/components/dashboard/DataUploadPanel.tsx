import { useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { computeGateRisk } from '../../lib/computeGateRisk';
import { normalizeGateId, STADIUM_GATES, type GateId } from '../../config/stadiumConfig';

interface CsvRow {
  gateId?: string;
  gate?: string;
  gateName?: string;
  currentCount?: string;
  current_count?: string;
  capacity?: string;
  previousCount?: string;
  previous_count?: string;
  secondsSinceLastReading?: string;
  seconds_since_last_reading?: string;
}

interface NormalizedReading {
  gateId: GateId;
  currentCount: number;
  capacity: number;
  previousCount: number;
  secondsSinceLastReading: number;
}

function firstDefined(...values: Array<string | undefined>): string {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? '';
}

function parseNumber(value: string, fieldName: string, rowNumber: number): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Row ${rowNumber}: "${fieldName}" must be a valid number.`);
  }
  return parsed;
}

function normalizeRow(row: CsvRow, rowNumber: number): NormalizedReading {
  const rawGateId = firstDefined(row.gateId, row.gate, row.gateName);
  const gateId = normalizeGateId(rawGateId);

  if (!gateId) {
    throw new Error(`Row ${rowNumber}: unknown gate "${rawGateId}". Use A, B, C, D, or a recognized gate name.`);
  }

  const currentCount = parseNumber(firstDefined(row.currentCount, row.current_count), 'currentCount', rowNumber);
  const capacity = parseNumber(firstDefined(row.capacity), 'capacity', rowNumber);
  const rawPreviousCount = firstDefined(row.previousCount, row.previous_count);
  const previousCount = rawPreviousCount ? parseNumber(rawPreviousCount, 'previousCount', rowNumber) : currentCount;
  const rawSeconds = firstDefined(row.secondsSinceLastReading, row.seconds_since_last_reading);
  const secondsSinceLastReading = rawSeconds ? parseNumber(rawSeconds, 'secondsSinceLastReading', rowNumber) : 60;

  if (capacity <= 0) {
    throw new Error(`Row ${rowNumber}: capacity must be greater than zero.`);
  }

  if (currentCount < 0 || previousCount < 0) {
    throw new Error(`Row ${rowNumber}: crowd counts cannot be negative.`);
  }

  if (secondsSinceLastReading < 0) {
    throw new Error(`Row ${rowNumber}: secondsSinceLastReading cannot be negative.`);
  }

  return { gateId, currentCount, capacity, previousCount, secondsSinceLastReading };
}

export default function DataUploadPanel() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }

    setError(null);
    setMessage(null);
    setIsUploading(true);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,

      complete: async (results) => {
        try {
          if (results.errors.length > 0) {
            throw new Error(results.errors.map((item) => item.message).join('; '));
          }

          if (results.data.length === 0) {
            throw new Error('The CSV contains no gate readings.');
          }

          /*
           * Map by canonical gate ID.
           *
           * If a CSV accidentally contains
           * Gate A twice, the LAST row wins
           * instead of creating duplicate
           * database identities.
           */
          const readings = new Map<GateId, NormalizedReading>();

          results.data.forEach((row, index) => {
            const normalized = normalizeRow(row, index + 2);
            readings.set(normalized.gateId, normalized);
          });

          if (readings.size > 4) {
            throw new Error('Aegis Grid supports exactly four canonical gates: A, B, C, and D.');
          }

          const batch = writeBatch(db);

          for (const reading of readings.values()) {
            const risk = computeGateRisk({
              gateId: reading.gateId,
              currentCount: reading.currentCount,
              capacity: reading.capacity,
              previousCount: reading.previousCount,
              secondsSinceLastReading: reading.secondsSinceLastReading,
            });

            /*
             * CRITICAL:
             *
             * Firestore document ID is the
             * canonical gate ID.
             *
             * Uploading the same gate again
             * updates the same document.
             */
            const gateRef = doc(db, 'gates', reading.gateId);

            batch.set(gateRef, {
              gateId: reading.gateId,
              gateName: STADIUM_GATES[reading.gateId].name,
              currentCount: reading.currentCount,
              capacity: reading.capacity,
              previousCount: reading.previousCount,
              secondsSinceLastReading: reading.secondsSinceLastReading,
              densityPct: risk.densityPct,
              netFlowPerMin: risk.netFlowPerMin,
              timeToCriticalSec: Number.isFinite(risk.timeToCriticalSec) ? risk.timeToCriticalSec : null,
              ruleBasedLevel: risk.ruleBasedLevel,
              riskLevel: risk.ruleBasedLevel,
              narrative: risk.ruleBasedLevel === 'LOW' ? 'Gate operating normally.' : 'Risk detected. Contextual reasoning pending.',
              recommendedGate: null,
              reasoningStatus: risk.ruleBasedLevel === 'LOW' ? 'not_required' : 'pending',
              lastUpdatedMs: Date.now(),
              dataSource: 'csv_upload',
            }, { merge: true });
          }

          await batch.commit();

          setMessage(`Successfully updated ${readings.size} canonical gate${readings.size === 1 ? '' : 's'}. Existing gates were updated rather than duplicated.`);
        } catch (uploadError) {
          console.error('CSV ingestion failed:', uploadError);
          setError(uploadError instanceof Error ? uploadError.message : 'CSV ingestion failed.');
        } finally {
          setIsUploading(false);
        }
      },

      error: (parseError) => {
        console.error('CSV parsing failed:', parseError);
        setError(parseError.message);
        setIsUploading(false);
      },
    });
  };

  return (
    <main style={{ minHeight: '100vh', background: '#121212', color: 'white', padding: '2rem', fontFamily: 'system-ui', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h1>Gate Data Ingestion</h1>

        <p style={{ color: '#bbb', lineHeight: 1.6 }}>
          Upload real or test telemetry for Gates A, B, C, and D. Re-uploading a gate updates its existing Firestore record rather than creating a duplicate gate.
        </p>

        <section style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #333', borderRadius: '8px', background: '#1b1b1b' }}>
          <label htmlFor="gate-csv" style={{ display: 'block', fontWeight: 700, marginBottom: '0.75rem' }}>
            Gate telemetry CSV
          </label>

          <input id="gate-csv" type="file" accept=".csv,text/csv" disabled={isUploading} onChange={handleFile} />

          <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '1rem' }}>
            Required fields: gateId (or gate/gateName), currentCount and capacity. Optional: previousCount and secondsSinceLastReading.
          </p>

          {isUploading && (
            <p role="status" aria-live="polite">Processing CSV…</p>
          )}

          {message && (
            <div role="status" aria-live="polite" style={{ marginTop: '1rem', padding: '1rem', background: '#15351f', border: '1px solid #2e7d32', borderRadius: '6px' }}>
              {message}
            </div>
          )}

          {error && (
            <div role="alert" style={{ marginTop: '1rem', padding: '1rem', background: '#3a1616', border: '1px solid #c62828', borderRadius: '6px' }}>
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}