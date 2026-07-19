import { describe, expect, it } from 'vitest';
import {
  buildVenueGraph,
  routeToNearestResponder,
  type CorridorEdge,
} from './routeToResponder';

describe('buildVenueGraph', () => {
  it('builds bidirectional corridor connections', () => {
    const graph = buildVenueGraph([
      { from: 'A', to: 'B', baseWalkTimeSec: 30 },
    ]);

    expect(graph.get('A')).toEqual([
      { to: 'B', baseWalkTimeSec: 30 },
    ]);

    expect(graph.get('B')).toEqual([
      { to: 'A', baseWalkTimeSec: 30 },
    ]);
  });

  it('handles an empty edge list', () => {
    expect(buildVenueGraph([]).size).toBe(0);
  });
});

describe('routeToNearestResponder', () => {
  const edges: CorridorEdge[] = [
    { from: 'A', to: 'B', baseWalkTimeSec: 60 },
    { from: 'B', to: 'C', baseWalkTimeSec: 60 },
    { from: 'A', to: 'D', baseWalkTimeSec: 80 },
    { from: 'D', to: 'C', baseWalkTimeSec: 80 },
  ];

  it('finds the nearest responder by weighted travel time', () => {
    const graph = buildVenueGraph(edges);

    const result = routeToNearestResponder(
      'A',
      new Set(['C', 'D']),
      graph,
      {},
    );

    expect(result).not.toBeNull();
    expect(result?.path).toEqual(['A', 'D']);
    expect(result?.etaSec).toBe(80);
  });

  it('changes routing when congestion makes a route slower', () => {
    const graph = buildVenueGraph([
      { from: 'A', to: 'B', baseWalkTimeSec: 20 },
      { from: 'B', to: 'R1', baseWalkTimeSec: 20 },
      { from: 'A', to: 'C', baseWalkTimeSec: 40 },
      { from: 'C', to: 'R2', baseWalkTimeSec: 40 },
    ]);

    const result = routeToNearestResponder(
      'A',
      new Set(['R1', 'R2']),
      graph,
      {
        B: 100,
        R1: 100,
        C: 0,
        R2: 0,
      },
    );

    expect(result).not.toBeNull();
    expect(result?.path).toEqual(['A', 'C', 'R2']);
    expect(result?.etaSec).toBe(80);
  });

  it('clamps density above 100 percent', () => {
    const graph = buildVenueGraph([
      { from: 'A', to: 'R', baseWalkTimeSec: 10 },
    ]);

    const result = routeToNearestResponder(
      'A',
      new Set(['R']),
      graph,
      { R: 500 },
    );

    expect(result?.etaSec).toBe(40);
  });

  it('clamps negative density to zero', () => {
    const graph = buildVenueGraph([
      { from: 'A', to: 'R', baseWalkTimeSec: 10 },
    ]);

    const result = routeToNearestResponder(
      'A',
      new Set(['R']),
      graph,
      { R: -50 },
    );

    expect(result?.etaSec).toBe(10);
  });

  it('returns null when no responder is reachable', () => {
    const graph = buildVenueGraph([
      { from: 'A', to: 'B', baseWalkTimeSec: 20 },
    ]);

    expect(
      routeToNearestResponder(
        'A',
        new Set(['UNREACHABLE']),
        graph,
        {},
      ),
    ).toBeNull();
  });

  it('does not dispatch to the starting zone itself', () => {
    const graph = buildVenueGraph([
      { from: 'A', to: 'B', baseWalkTimeSec: 20 },
    ]);

    expect(
      routeToNearestResponder(
        'A',
        new Set(['A']),
        graph,
        {},
      ),
    ).toBeNull();
  });

  it('returns the complete path to the responder', () => {
    const graph = buildVenueGraph([
      { from: 'A', to: 'B', baseWalkTimeSec: 10 },
      { from: 'B', to: 'C', baseWalkTimeSec: 20 },
      { from: 'C', to: 'R', baseWalkTimeSec: 30 },
    ]);

    const result = routeToNearestResponder(
      'A',
      new Set(['R']),
      graph,
      {},
    );

    expect(result?.path).toEqual(['A', 'B', 'C', 'R']);
    expect(result?.etaSec).toBe(60);
  });
});