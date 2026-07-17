import { IncidentPriorityQueue } from './priorityQueue';

describe('IncidentPriorityQueue', () => {
  it('never allows an extremely old low-severity incident to outrank a new high-severity one', () => {
    const q = new IncidentPriorityQueue();
    // Massive ageSec to prove the strict comparator logic works without magic numbers
    q.push({ incidentId: 'old-but-minor', severity: 1, ageSec: 9999999 }); 
    q.push({ incidentId: 'new-but-critical', severity: 5, ageSec: 2 });
    
    expect(q.popHighestPriority()?.incidentId).toBe('new-but-critical');
    expect(q.popHighestPriority()?.incidentId).toBe('old-but-minor');
  });

  it('returns the highest severity incident first', () => {
    const q = new IncidentPriorityQueue();
    q.push({ incidentId: 'low', severity: 2, ageSec: 5 });
    q.push({ incidentId: 'high', severity: 5, ageSec: 1 });
    expect(q.popHighestPriority()?.incidentId).toBe('high');
  });

  it('breaks a severity tie by favoring the older incident', () => {
    const q = new IncidentPriorityQueue();
    q.push({ incidentId: 'newer', severity: 3, ageSec: 10 });
    q.push({ incidentId: 'older', severity: 3, ageSec: 500 });
    expect(q.popHighestPriority()?.incidentId).toBe('older');
  });

  it('returns null when popping from an empty queue', () => {
    expect(new IncidentPriorityQueue().popHighestPriority()).toBeNull();
  });
});