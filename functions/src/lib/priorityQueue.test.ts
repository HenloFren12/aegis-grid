import { describe, expect, it } from 'vitest';
import {
  IncidentPriorityQueue,
  type QueuedIncident,
} from './priorityQueue';

function incident(
  incidentId: string,
  severity: number,
  ageSec: number,
): QueuedIncident {
  return { incidentId, severity, ageSec };
}

describe('IncidentPriorityQueue', () => {
  it('returns null when empty', () => {
    const queue = new IncidentPriorityQueue();

    expect(queue.popHighestPriority()).toBeNull();
    expect(queue.size()).toBe(0);
  });

  it('prioritizes higher severity regardless of insertion order', () => {
    const queue = new IncidentPriorityQueue();

    queue.push(incident('low', 1, 500));
    queue.push(incident('critical', 5, 10));
    queue.push(incident('medium', 3, 100));

    expect(queue.popHighestPriority()?.incidentId).toBe('critical');
    expect(queue.popHighestPriority()?.incidentId).toBe('medium');
    expect(queue.popHighestPriority()?.incidentId).toBe('low');
  });

  it('prioritizes older incidents when severity is equal', () => {
    const queue = new IncidentPriorityQueue();

    queue.push(incident('newer', 4, 20));
    queue.push(incident('oldest', 4, 300));
    queue.push(incident('middle', 4, 100));

    expect(queue.popHighestPriority()?.incidentId).toBe('oldest');
    expect(queue.popHighestPriority()?.incidentId).toBe('middle');
    expect(queue.popHighestPriority()?.incidentId).toBe('newer');
  });

  it('keeps severity dominant over age', () => {
    const queue = new IncidentPriorityQueue();

    queue.push(incident('old-low', 2, 10_000));
    queue.push(incident('new-critical', 5, 1));

    expect(queue.popHighestPriority()?.incidentId)
      .toBe('new-critical');
  });

  it('tracks queue size through pushes and pops', () => {
    const queue = new IncidentPriorityQueue();

    queue.push(incident('a', 1, 1));
    queue.push(incident('b', 2, 2));

    expect(queue.size()).toBe(2);

    queue.popHighestPriority();
    expect(queue.size()).toBe(1);

    queue.popHighestPriority();
    expect(queue.size()).toBe(0);
  });

  it('handles a single incident correctly', () => {
    const queue = new IncidentPriorityQueue();
    const only = incident('only', 5, 50);

    queue.push(only);

    expect(queue.popHighestPriority()).toEqual(only);
    expect(queue.popHighestPriority()).toBeNull();
  });
});