export type ReportCategory =
  | "medical"
  | "security"
  | "lost_child"
  | "other";

export type ReportSource =
  | "fan"
  | "staff";

export interface RawReport {
  id: string;
  category: ReportCategory;
  lat: number;
  lng: number;
  text: string;
  source: ReportSource;
  timestampMs: number;
  ageFenceOk?: boolean;
  geofenceOk?: boolean;
}

export interface IncidentCluster {
  incidentId: string;
  reports: RawReport[];
  centroid: {
    lat: number;
    lng: number;
  };
  categories: Set<ReportCategory>;
}

const DEFAULT_WINDOW_MS = 90_000;
const DEFAULT_DISTANCE_METERS = 75;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates geographic distance using the Haversine formula.
 * This avoids artificial clustering errors caused by rounded
 * latitude/longitude buckets.
 */
function distanceMeters(
  firstLat: number,
  firstLng: number,
  secondLat: number,
  secondLng: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(secondLat - firstLat);
  const longitudeDelta = toRadians(secondLng - firstLng);
  const firstLatitude = toRadians(firstLat);
  const secondLatitude = toRadians(secondLat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    );

  return earthRadiusMeters * angularDistance;
}

function isValidReport(report: RawReport): boolean {
  return (
    typeof report.id === "string" &&
    report.id.trim().length > 0 &&
    Number.isFinite(report.lat) &&
    Number.isFinite(report.lng) &&
    Number.isFinite(report.timestampMs)
  );
}

function updateCentroid(
  cluster: IncidentCluster,
  report: RawReport,
): void {
  const existingCount = cluster.reports.length;

  cluster.centroid = {
    lat:
      (cluster.centroid.lat * existingCount + report.lat) /
      (existingCount + 1),
    lng:
      (cluster.centroid.lng * existingCount + report.lng) /
      (existingCount + 1),
  };
}

/**
 * Groups reports by temporal and geographic proximity.
 *
 * Backward compatible:
 * Existing backend callers using clusterReports(reports, windowMs)
 * continue to work because maxDistanceMeters is optional.
 */
export function clusterReports(
  reports: RawReport[],
  windowMs = DEFAULT_WINDOW_MS,
  maxDistanceMeters = DEFAULT_DISTANCE_METERS,
): IncidentCluster[] {
  const sortedReports = [...reports]
    .filter(isValidReport)
    .sort(
      (first, second) =>
        first.timestampMs - second.timestampMs,
    );

  const clusters: IncidentCluster[] = [];

  for (const report of sortedReports) {
    let bestCluster: IncidentCluster | undefined;
    let shortestDistance = Number.POSITIVE_INFINITY;

    for (
      let index = clusters.length - 1;
      index >= 0;
      index -= 1
    ) {
      const cluster = clusters[index];

      const latestReport =
        cluster.reports[cluster.reports.length - 1];

      if (!latestReport) {
        continue;
      }

      const timeDifference =
        report.timestampMs - latestReport.timestampMs;

      /*
       * Because reports are sorted chronologically,
       * once older clusters fall outside the time window,
       * earlier clusters cannot be valid candidates either.
       */
      if (timeDifference > windowMs) {
        break;
      }

      if (timeDifference < 0) {
        continue;
      }

      const distance = distanceMeters(
        report.lat,
        report.lng,
        cluster.centroid.lat,
        cluster.centroid.lng,
      );

      if (
        distance <= maxDistanceMeters &&
        distance < shortestDistance
      ) {
        bestCluster = cluster;
        shortestDistance = distance;
      }
    }

    if (bestCluster) {
      updateCentroid(bestCluster, report);
      bestCluster.reports.push(report);
      bestCluster.categories.add(report.category);
      continue;
    }

    clusters.push({
      incidentId: `inc_${report.id}`,
      reports: [report],
      centroid: {
        lat: report.lat,
        lng: report.lng,
      },
      categories: new Set([report.category]),
    });
  }

  return clusters;
}
