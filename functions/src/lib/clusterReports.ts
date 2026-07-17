export interface RawReport {
  id: string;
  category: 'medical' | 'security' | 'lost_child' | 'other';
  lat: number;
  lng: number;
  text: string;
  source: 'fan' | 'staff';
  timestampMs: number;
}

export interface IncidentCluster {
  incidentId: string;
  reports: RawReport[];
  centroid: { lat: number; lng: number };
  categories: Set<RawReport['category']>;
}

function spatialBucket(lat: number, lng: number, precisionDecimals = 4): string {
  return `${lat.toFixed(precisionDecimals)}:${lng.toFixed(precisionDecimals)}`;
}

export function clusterReports(reports: RawReport[], windowMs = 90_000): IncidentCluster[] {
  const sorted = [...reports].sort((a, b) => a.timestampMs - b.timestampMs); 
  const buckets = new Map<string, IncidentCluster>();
  const clusters: IncidentCluster[] = [];

  for (const report of sorted) {
    const key = spatialBucket(report.lat, report.lng);
    const existing = buckets.get(key);
    const lastTs = existing?.reports[existing.reports.length - 1]?.timestampMs ?? -Infinity;

    if (existing && report.timestampMs - lastTs <= windowMs) {
      // Fix: Incrementally shift the centroid
      const n = existing.reports.length;
      existing.centroid.lat = (existing.centroid.lat * n + report.lat) / (n + 1);
      existing.centroid.lng = (existing.centroid.lng * n + report.lng) / (n + 1);
      
      existing.reports.push(report);
      existing.categories.add(report.category);
    } else {
      const cluster: IncidentCluster = {
        incidentId: `inc_${report.id}`,
        reports: [report],
        centroid: { lat: report.lat, lng: report.lng },
        categories: new Set([report.category]),
      };
      buckets.set(key, cluster);
      clusters.push(cluster);
    }
  }
  return clusters;
}