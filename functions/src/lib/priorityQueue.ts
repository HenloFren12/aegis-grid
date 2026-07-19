export interface QueuedIncident {
  incidentId: string;
  severity: number; // 1–5 scale
  ageSec: number;
}

// Fix: Strict comparative logic eliminates magic number overlap risks
function isHigherPriority(a: QueuedIncident, b: QueuedIncident): boolean {
  if (a.severity !== b.severity) {
    return a.severity > b.severity; // Higher severity wins
  }
  return a.ageSec > b.ageSec; // Older age wins if tied
}

export class IncidentPriorityQueue {
  private heap: QueuedIncident[] = [];

  push(incident: QueuedIncident): void {
    this.heap.push(incident);
    this.bubbleUp(this.heap.length - 1);
  }

  popHighestPriority(): QueuedIncident | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop() as QueuedIncident;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  size(): number {
    return this.heap.length;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (isHigherPriority(this.heap[parent], this.heap[i])) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let largest = i;

      if (left < n && isHigherPriority(this.heap[left], this.heap[largest])) largest = left;
      if (right < n && isHigherPriority(this.heap[right], this.heap[largest])) largest = right;
      if (largest === i) break;

      [this.heap[largest], this.heap[i]] = [this.heap[i], this.heap[largest]];
      i = largest;
    }
  }
}
