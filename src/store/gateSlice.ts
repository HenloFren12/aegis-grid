import { create } from 'zustand';

export type GateRiskLevel =
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'CRITICAL';

export type ReasoningStatus =
  | 'not_required'
  | 'pending'
  | 'complete'
  | 'unavailable';

export interface GateDocument {
  gateId: string;

  currentCount: number;
  capacity: number;
  previousCount: number;
  secondsSinceLastReading: number;

  densityPct: number;
  netFlowPerMin: number;
  timeToCriticalSec: number | null;

  ruleBasedLevel: GateRiskLevel;
  riskLevel: GateRiskLevel;

  narrative: string | null;
  recommendedGate: string | null;

  reasoningStatus: ReasoningStatus;

  lastUpdatedMs: number;

  dataSource?: string;
  processingError?: string;
}

interface GateState {
  gates: Record<
    string,
    GateDocument
  >;

  setGates: (
    gates: Record<
      string,
      GateDocument
    >,
  ) => void;

  clearGates: () => void;
}

export const useGateStore =
  create<GateState>((set) => ({
    gates: {},

    setGates: (gates) =>
      set({
        gates,
      }),

    clearGates: () =>
      set({
        gates: {},
      }),
  }));

export const selectGateById =
  (id: string) =>
  (state: GateState) =>
    state.gates[id];

export const selectAllGates = (
  state: GateState,
): GateDocument[] =>
  Object.values(state.gates);