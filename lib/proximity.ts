import type { Category, Coordinates, Occurrence } from "./contracts";
import { haversineKm } from "./recurrence";

export const proximityCategories = ["fire_smoke", "water_contamination", "waste_disposal"] as const;

export type ProximityCategory = (typeof proximityCategories)[number];

export interface LocatedOccurrence {
  occurrence: Occurrence;
  category: ProximityCategory;
  coordinates: Coordinates;
  timestamp: number;
}

export interface ProximityGroup {
  id: string;
  category: ProximityCategory;
  items: LocatedOccurrence[];
  coordinates: Coordinates;
  startAt: string;
  endAt: string;
  periodDays: number;
  minimumDistanceKm: number;
}

export interface ProximityGroups {
  groups: ProximityGroup[];
  individuals: LocatedOccurrence[];
}

export interface ProjectionInput {
  id: string;
  coordinates: Coordinates;
}

export interface ProjectedPoint {
  id: string;
  x: number;
  y: number;
}

export interface ProjectionResult {
  points: ProjectedPoint[];
  kmPerPixel: number;
}

interface ProjectionPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ProjectionOptions {
  width?: number;
  height?: number;
  padding?: number | ProjectionPadding;
  minimumExtentKm?: number;
}

const DAY_MS = 86_400_000;
const KM_PER_LATITUDE_DEGREE = 111.195;

function isProximityCategory(category?: Category): category is ProximityCategory {
  return proximityCategories.some((candidate) => candidate === category);
}

function validCoordinates(coordinates?: Coordinates): coordinates is Coordinates {
  return Boolean(
    coordinates &&
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude) &&
    Math.abs(coordinates.latitude) <= 90 &&
    Math.abs(coordinates.longitude) <= 180
  );
}

export function eligibleProximityOccurrences(items: Occurrence[]): LocatedOccurrence[] {
  return items.flatMap((occurrence) => {
    const timestamp = new Date(occurrence.observedAt).getTime();
    if (!validCoordinates(occurrence.coordinates) || !occurrence.analysis || !isProximityCategory(occurrence.analysis.category) || !Number.isFinite(timestamp)) return [];
    return [{ occurrence, category: occurrence.analysis.category, coordinates: occurrence.coordinates, timestamp }];
  });
}

function minimumPairDistance(items: LocatedOccurrence[]) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let first = 0; first < items.length; first += 1) {
    for (let second = first + 1; second < items.length; second += 1) {
      minimum = Math.min(minimum, haversineKm(items[first].coordinates, items[second].coordinates));
    }
  }
  return Number.isFinite(minimum) ? minimum : 0;
}

/**
 * Finds recurrence groups from newest to oldest. Once an occurrence joins a group,
 * it cannot be reused by another one.
 */
export function groupProximityOccurrences(items: Occurrence[], radiusKm = 2, days = 14): ProximityGroups {
  const located = eligibleProximityOccurrences(items)
    .sort((a, b) => b.timestamp - a.timestamp || a.occurrence.id.localeCompare(b.occurrence.id));
  const assigned = new Set<string>();
  const groups: ProximityGroup[] = [];

  for (const current of located) {
    if (assigned.has(current.occurrence.id)) continue;
    const previous = located.filter((candidate) =>
      !assigned.has(candidate.occurrence.id) &&
      candidate.occurrence.id !== current.occurrence.id &&
      candidate.category === current.category &&
      candidate.timestamp < current.timestamp &&
      current.timestamp - candidate.timestamp <= days * DAY_MS &&
      haversineKm(current.coordinates, candidate.coordinates) <= radiusKm
    );
    if (previous.length < 2) continue;

    const members = [current, ...previous].sort((a, b) => b.timestamp - a.timestamp);
    members.forEach((member) => assigned.add(member.occurrence.id));
    const timestamps = members.map((member) => member.timestamp);
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    groups.push({
      id: `group-${current.occurrence.id}`,
      category: current.category,
      items: members,
      coordinates: {
        latitude: members.reduce((total, member) => total + member.coordinates.latitude, 0) / members.length,
        longitude: members.reduce((total, member) => total + member.coordinates.longitude, 0) / members.length
      },
      startAt: new Date(oldest).toISOString(),
      endAt: new Date(newest).toISOString(),
      periodDays: Math.ceil((newest - oldest) / DAY_MS),
      minimumDistanceKm: minimumPairDistance(members)
    });
  }

  return {
    groups,
    individuals: located.filter((item) => !assigned.has(item.occurrence.id))
  };
}

/** Projects geographic points in local kilometres with one scale for both axes. */
export function projectCoordinates(inputs: ProjectionInput[], options: ProjectionOptions = {}): ProjectionResult {
  const width = options.width ?? 640;
  const height = options.height ?? 360;
  const paddingOption = options.padding ?? 38;
  const padding = typeof paddingOption === "number"
    ? { top: paddingOption, right: paddingOption, bottom: paddingOption, left: paddingOption }
    : paddingOption;
  const minimumExtentKm = options.minimumExtentKm ?? 4;
  const usableWidth = Math.max(1, width - padding.left - padding.right);
  const usableHeight = Math.max(1, height - padding.top - padding.bottom);
  const viewportCenterX = padding.left + usableWidth / 2;
  const viewportCenterY = padding.top + usableHeight / 2;
  const valid = inputs.filter((input) => validCoordinates(input.coordinates));

  if (!valid.length) return { points: [], kmPerPixel: minimumExtentKm / Math.min(usableWidth, usableHeight) };

  const centerLatitude = valid.reduce((total, input) => total + input.coordinates.latitude, 0) / valid.length;
  const longitudeKm = KM_PER_LATITUDE_DEGREE * Math.max(0.01, Math.cos(centerLatitude * Math.PI / 180));
  const local = valid.map((input) => ({
    id: input.id,
    x: input.coordinates.longitude * longitudeKm,
    y: input.coordinates.latitude * KM_PER_LATITUDE_DEGREE
  }));
  const minX = Math.min(...local.map((point) => point.x));
  const maxX = Math.max(...local.map((point) => point.x));
  const minY = Math.min(...local.map((point) => point.y));
  const maxY = Math.max(...local.map((point) => point.y));
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = Math.min(
    usableWidth / Math.max(spanX, minimumExtentKm),
    usableHeight / Math.max(spanY, minimumExtentKm)
  );
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    points: local.map((point) => ({
      id: point.id,
      x: viewportCenterX + (point.x - centerX) * scale,
      y: viewportCenterY - (point.y - centerY) * scale
    })),
    kmPerPixel: 1 / scale
  };
}

export function closestSimilarDistance(item: LocatedOccurrence, all: LocatedOccurrence[]) {
  const distances = all
    .filter((candidate) => candidate.occurrence.id !== item.occurrence.id && candidate.category === item.category)
    .map((candidate) => haversineKm(item.coordinates, candidate.coordinates));
  return distances.length ? Math.min(...distances) : undefined;
}
