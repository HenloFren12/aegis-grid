import { routeToNearestResponder, buildVenueGraph } from './routeToResponder';

describe('routeToNearestResponder', () => {
  it('prefers a longer path over a shorter one through a highly congested corridor', () => {
    const edges = [
      { from: 'A', to: 'B', baseWalkTimeSec: 30 }, 
      { from: 'A', to: 'C', baseWalkTimeSec: 20 }, 
      { from: 'C', to: 'B', baseWalkTimeSec: 20 }
    ];
    const graph = buildVenueGraph(edges);
    const density = { B: 95, C: 5 }; // B is heavily congested
    
    const result = routeToNearestResponder('A', new Set(['B']), graph, density);
    
    // Direct path A->B gets penalized heavily; path A->C->B should be chosen
    expect(result?.path).toEqual(['A', 'C', 'B']);
  });

  it('returns null when no responder zone is reachable', () => {
    const edges = [{ from: 'A', to: 'B', baseWalkTimeSec: 10 }];
    const graph = buildVenueGraph(edges);
    
    const result = routeToNearestResponder('A', new Set(['Z']), graph, {});
    expect(result).toBeNull();
  });

  it('returns null when the start zone is itself a responder zone', () => {
    const graph = buildVenueGraph([]);
    
    const result = routeToNearestResponder('A', new Set(['A']), graph, {});
    expect(result).toBeNull();
  });
});