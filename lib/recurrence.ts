import type { Category, Coordinates, Occurrence } from "./contracts";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Coordinates, b: Coordinates) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function roundCoordinates(coords: Coordinates): Coordinates {
  return { latitude: Number(coords.latitude.toFixed(3)), longitude: Number(coords.longitude.toFixed(3)) };
}

export interface RecurrenceResult {
  found: boolean;
  count: number;
  closestKm?: number;
  periodDays: number;
  recurringSigns: string[];
  matches: Occurrence[];
}

export function findRecurrence(current: Occurrence, history: Occurrence[], radiusKm = 2, days = 14): RecurrenceResult {
  if (!current.coordinates || !current.analysis || ["uncertain", "out_of_scope"].includes(current.analysis.category)) {
    return { found: false, count: 0, periodDays: days, recurringSigns: [], matches: [] };
  }
  const now = new Date(current.observedAt).getTime();
  const category: Category = current.analysis.category;
  const matches = history.filter((item) => {
    if (item.id === current.id || !item.coordinates || item.analysis?.category !== category) return false;
    const age = now - new Date(item.observedAt).getTime();
    return age >= 0 && age <= days * 86_400_000 && haversineKm(current.coordinates!, item.coordinates) <= radiusKm;
  });
  const currentSigns = new Set(current.analysis.observedSigns.map((sign) => sign.code));
  const recurringSigns = [...new Set(matches.flatMap((item) => item.analysis?.observedSigns.map((sign) => sign.code) ?? []))]
    .filter((code) => currentSigns.has(code));
  const distances = matches.map((item) => haversineKm(current.coordinates!, item.coordinates!));
  return {
    found: matches.length >= 2,
    count: matches.length,
    closestKm: distances.length ? Math.min(...distances) : undefined,
    periodDays: days,
    recurringSigns,
    matches
  };
}
