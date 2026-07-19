export const GATE_IDS = [
  'A',
  'B',
  'C',
  'D',
] as const;

export type GateId =
  (typeof GATE_IDS)[number];

export interface StadiumGate {
  id: GateId;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
}

export const STADIUM_GATES: Record<
  GateId,
  StadiumGate
> = {
  A: {
    id: 'A',
    name: 'Gate A — North Entrance',
    shortName: 'North Entrance',
    lat: 40.7128,
    lng: -74.006,
  },

  B: {
    id: 'B',
    name: 'Gate B — South Entrance',
    shortName: 'South Entrance',
    lat: 40.712,
    lng: -74.006,
  },

  C: {
    id: 'C',
    name: 'Gate C — East Entrance',
    shortName: 'East Entrance',
    lat: 40.7125,
    lng: -74.0055,
  },

  D: {
    id: 'D',
    name: 'Gate D — West Entrance',
    shortName: 'West Entrance',
    lat: 40.7125,
    lng: -74.0065,
  },
};

export const STADIUM_GATE_LIST =
  GATE_IDS.map(
    (id) => STADIUM_GATES[id],
  );

const GATE_ALIASES: Record<
  string,
  GateId
> = {
  a: 'A',
  'gate a': 'A',
  'north gate': 'A',
  'north entrance': 'A',
  'north section': 'A',

  b: 'B',
  'gate b': 'B',
  'south gate': 'B',
  'south entrance': 'B',
  'south section': 'B',

  c: 'C',
  'gate c': 'C',
  'east gate': 'C',
  'east entrance': 'C',
  'section 100': 'C',
  'section 100s': 'C',

  d: 'D',
  'gate d': 'D',
  'west gate': 'D',
  'west entrance': 'D',
  'section 200': 'D',
  'section 200s': 'D',
};

export function normalizeGateId(
  value: unknown,
): GateId | null {
  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  return (
    GATE_ALIASES[normalized] ??
    null
  );
}

export function getGateLabel(
  gateId: string,
): string {
  const normalized =
    normalizeGateId(gateId);

  if (!normalized) {
    return gateId;
  }

  return STADIUM_GATES[
    normalized
  ].name;
}