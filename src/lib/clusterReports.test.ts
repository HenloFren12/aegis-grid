import { describe, expect, it } from 'vitest';
import {
  clusterReports,
  type RawReport,
} from './clusterReports';

function report(
  id: string,
  lat: number,
  lng: number,
  timestampMs: number,
  category: RawReport['category'] = 'security',
): RawReport {
  return {
    id,
    category,
    lat,
    lng,
    text: `Report ${id}`,
    source: 'fan',
    timestampMs,
  };
}

describe('clusterReports', () => {
  it('returns an empty array for no reports', () => {
    expect(clusterReports([])).toEqual([]);
  });

  it('creates one cluster for a single valid report', () => {
    const clusters = clusterReports([
      report('r1', 19.076, 72.8777, 1000),
    ]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].incidentId).toBe('inc_r1');
    expect(clusters[0].reports).toHaveLength(1);
    expect(clusters[0].centroid).toEqual({
      lat: 19.076,
      lng: 72.8777,
    });
  });

  it('clusters nearby reports within the time window', () => {
    const clusters = clusterReports([
      report('r1', 19.076, 72.8777, 1000, 'medical'),
      report('r2', 19.0762, 72.8778, 20_000, 'security'),
    ]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].reports).toHaveLength(2);
    expect(clusters[0].categories).toEqual(
      new Set(['medical', 'security']),
    );
  });

  it('separates reports outside the distance threshold', () => {
    const clusters = clusterReports([
      report('r1', 19.076, 72.8777, 1000),
      report('r2', 19.086, 72.8877, 2000),
    ]);

    expect(clusters).toHaveLength(2);
  });

  it('separates nearby reports outside the time window', () => {
    const clusters = clusterReports([
      report('r1', 19.076, 72.8777, 1000),
      report('r2', 19.0761, 72.8778, 100_000),
    ]);

    expect(clusters).toHaveLength(2);
  });

  it('clusters reports exactly at the time-window boundary', () => {
    const clusters = clusterReports(
      [
        report('r1', 19.076, 72.8777, 0),
        report('r2', 19.0761, 72.8777, 90_000),
      ],
      90_000,
    );

    expect(clusters).toHaveLength(1);
  });

  it('supports a custom distance threshold', () => {
    const reports = [
      report('r1', 19.076, 72.8777, 1000),
      report('r2', 19.0765, 72.8777, 2000),
    ];

    expect(clusterReports(reports, 90_000, 100))
      .toHaveLength(1);

    expect(clusterReports(reports, 90_000, 10))
      .toHaveLength(2);
  });

  it('updates the centroid when reports merge', () => {
    const clusters = clusterReports([
      report('r1', 19.076, 72.8777, 1000),
      report('r2', 19.0762, 72.8779, 2000),
    ]);

    expect(clusters[0].centroid.lat)
      .toBeCloseTo(19.0761);

    expect(clusters[0].centroid.lng)
      .toBeCloseTo(72.8778);
  });

  it('sorts unsorted reports chronologically before clustering', () => {
    const clusters = clusterReports([
      report('later', 19.0761, 72.8778, 20_000),
      report('first', 19.076, 72.8777, 1000),
    ]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].incidentId).toBe('inc_first');
    expect(clusters[0].reports[0].id).toBe('first');
    expect(clusters[0].reports[1].id).toBe('later');
  });

  it('filters reports with an empty ID', () => {
    const invalid = report('', 19.076, 72.8777, 1000);

    expect(clusterReports([invalid])).toEqual([]);
  });

  it('filters reports with invalid coordinates', () => {
    const invalid = report(
      'invalid',
      Number.NaN,
      72.8777,
      1000,
    );

    expect(clusterReports([invalid])).toEqual([]);
  });

  it('filters reports with invalid timestamps', () => {
    const invalid = report(
      'invalid',
      19.076,
      72.8777,
      Number.NaN,
    );

    expect(clusterReports([invalid])).toEqual([]);
  });

  it('does not mutate the original report array order', () => {
    const reports = [
      report('later', 19.0761, 72.8778, 20_000),
      report('first', 19.076, 72.8777, 1000),
    ];

    clusterReports(reports);

    expect(reports[0].id).toBe('later');
    expect(reports[1].id).toBe('first');
  });

  it('assigns a report to the nearest eligible cluster', () => {
    const clusters = clusterReports(
      [
        report('a', 19.076, 72.8777, 1000),
        report('b', 19.077, 72.8777, 1000),
        report('near-b', 19.0769, 72.8777, 2000),
      ],
      90_000,
      150,
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0].reports).toHaveLength(3);
  });
});