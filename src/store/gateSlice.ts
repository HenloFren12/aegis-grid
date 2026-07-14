import { create } from 'zustand';
import type { GateRiskFeatures } from '../lib/computeGateRisk';

// Canonical schema matching Firestore exactly
export interface GateDocument extends Omit<GateRiskFeatures, 'gateId'> {
  narrative: string | null;
  recommendedGate: string | null;
  lastUpdatedMs: number;
}

interface GateState {
  gates: Record<string, GateDocument>;
  setGates: (gates: Record<string, GateDocument>) => void;
}

export const useGateStore = create<GateState>((set) => ({
  gates: {},
  setGates: (gates) => set({ gates }),
}));

// Narrow selectors for O(1) performance in React components
export const selectGateById = (id: string) => (state: GateState) => state.gates[id];