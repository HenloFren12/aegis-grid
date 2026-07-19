export interface CorridorEdge { from: string; to: string; baseWalkTimeSec: number; }
export type DensityMap = Record<string, number>;
export type AdjacencyList = Map<string, Array<{ to: string; baseWalkTimeSec: number }>>;

function congestionMultiplier(densityPct: number): number {
  const d = Math.max(0, Math.min(100, densityPct)) / 100;
  return 1 + 3 * d * d;
}

// Fix: Extract graph generation so the system can cache it
export function buildVenueGraph(edges: CorridorEdge[]): AdjacencyList {
  const adj: AdjacencyList = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push({to: e.to, baseWalkTimeSec: e.baseWalkTimeSec});

    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.to)!.push({to: e.from, baseWalkTimeSec: e.baseWalkTimeSec});
  }
  return adj;
}

class MinHeap<T> {
  private items: T[] = [];
  constructor(private compare: (a: T, b: T) => number) {}

  push(item: T): void {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.compare(this.items[p], this.items[i]) <= 0) break;
      [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
      i = p;
    }
  }

  pop(): T | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last !== undefined) {
      this.items[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1; const r = 2 * i + 2;
        let smallest = i;
        if (l < this.items.length && this.compare(this.items[l], this.items[smallest]) < 0) smallest = l;
        if (r < this.items.length && this.compare(this.items[r], this.items[smallest]) < 0) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export function routeToNearestResponder(
  startZoneId: string,
  responderZoneIds: Set<string>, // Fix: Changed to Set for O(1)
  graph: AdjacencyList, // Fix: Injects the pre-built graph
  density: DensityMap
): { path: string[]; etaSec: number } | null {
  const dist = new Map<string, number>([[startZoneId, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  const heap = new MinHeap<{ id: string; dist: number }>((a, b) => a.dist - b.dist);
  heap.push({id: startZoneId, dist: 0});

  while (!heap.isEmpty()) {
    const current = heap.pop()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (responderZoneIds.has(current.id) && current.id !== startZoneId) {
      const path: string[] = [current.id];
      let step = current.id;
      while (prev.has(step)) {
        step = prev.get(step)!;
        path.unshift(step);
      }
      return {path, etaSec: dist.get(current.id)!};
    }

    for (const neighbor of graph.get(current.id) ?? []) {
      const weight = neighbor.baseWalkTimeSec * congestionMultiplier(density[neighbor.to] ?? 0);
      const newDist = (dist.get(current.id) ?? Infinity) + weight;

      if (newDist < (dist.get(neighbor.to) ?? Infinity)) {
        dist.set(neighbor.to, newDist);
        prev.set(neighbor.to, current.id);
        heap.push({id: neighbor.to, dist: newDist});
      }
    }
  }
  return null;
}
