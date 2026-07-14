import { clusterReports, RawReport } from './clusterReports';

const mockReport = (overrides: Partial<RawReport>): RawReport => ({
  id: Math.random().toString(),
  category: 'other',
  lat: 0,
  lng: 0,
  text: '',
  source: 'fan',
  timestampMs: 0,
  ...overrides,
});

describe('clusterReports', () => {
  it('incrementally recalculates the true centroid when a new report merges', () => {
    const reports = [
      mockReport({ lat: 1.0001, lng: 1.0001, timestampMs: 1000 }), 
      mockReport({ lat: 1.0003, lng: 1.0003, timestampMs: 1500 })
    ];
    const clusters = clusterReports(reports);
    expect(clusters[0].centroid.lat).toBeCloseTo(1.0002);
    expect(clusters[0].centroid.lng).toBeCloseTo(1.0002);
  });

  it('merges two reports at the same location within the time window into one cluster', () => {
    const reports = [
      mockReport({ lat: 1.0, lng: 1.0, timestampMs: 1000 }), 
      mockReport({ lat: 1.0, lng: 1.0, timestampMs: 1500 })
    ];
    expect(clusterReports(reports)).toHaveLength(1);
  });

  it('keeps two reports at the same location as separate clusters when outside the time window', () => {
    const reports = [
      mockReport({ lat: 1.0, lng: 1.0, timestampMs: 0 }), 
      mockReport({ lat: 1.0, lng: 1.0, timestampMs: 200_000 })
    ];
    expect(clusterReports(reports, 90_000)).toHaveLength(2);
  });

  it('keeps two reports far apart as separate clusters even within the same second', () => {
    const reports = [
      mockReport({ lat: 1.0, lng: 1.0, timestampMs: 0 }), 
      mockReport({ lat: 40.0, lng: 40.0, timestampMs: 100 })
    ];
    expect(clusterReports(reports)).toHaveLength(2);
  });

  it('flags a cluster with mixed categories via categories.size > 1', () => {
    const reports = [
      mockReport({ lat: 1.0, lng: 1.0, category: 'medical', timestampMs: 0 }), 
      mockReport({ lat: 1.0, lng: 1.0, category: 'security', timestampMs: 100 })
    ];
    const clusters = clusterReports(reports);
    expect(clusters[0].categories.size).toBe(2);
  });

  it('returns an empty array when given no reports', () => {
    expect(clusterReports([])).toEqual([]);
  });
});