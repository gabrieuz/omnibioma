import { describe, expect, it } from "vitest";
import type { Occurrence } from "@/lib/contracts";
import { groupProximityOccurrences, projectCoordinates } from "@/lib/proximity";

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 6, 22, 12);
const analysis = {
  category: "waste_disposal",
  confidence: "high",
  imageQuality: "good",
  observedSigns: [{ code: "waste_accumulation", source: "both" }],
  missingInformation: [],
  summary: "Resíduos acumulados foram observados no local.",
  uncertainties: []
} as const;

function occurrence(id: string, daysAgo: number, latitude = 0): Occurrence {
  const observedAt = new Date(NOW - daysAgo * DAY_MS).toISOString();
  return {
    id,
    createdAt: observedAt,
    observedAt,
    report: "Relato de resíduos acumulados.",
    placeDescription: `Local ${id}`,
    coordinates: { latitude, longitude: 0 },
    localPhotoPresent: false,
    analysisState: "analyzed",
    progress: "registered",
    analysis: {
      ...analysis,
      observedSigns: [...analysis.observedSigns],
      missingInformation: [...analysis.missingInformation],
      uncertainties: [...analysis.uncertainties]
    },
    answers: {}
  };
}

describe("agrupamento da visão de proximidade", () => {
  it("forma um único grupo nos limites inclusivos de 2 km e 14 dias", () => {
    const latitudeAtTwoKm = 2 / 111.195;
    const result = groupProximityOccurrences([
      occurrence("current", 0),
      occurrence("middle", 7, latitudeAtTwoKm / 2),
      occurrence("boundary", 14, latitudeAtTwoKm)
    ]);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].items.map((item) => item.occurrence.id)).toEqual(["current", "middle", "boundary"]);
    expect(result.individuals).toHaveLength(0);
    expect(new Set(result.groups.flatMap((group) => group.items.map((item) => item.occurrence.id))).size).toBe(3);
  });

  it("não forma grupo quando distância ou período excedem os limites", () => {
    const outsideRadius = groupProximityOccurrences([
      occurrence("current", 0),
      occurrence("near", 2, 0.001),
      occurrence("far", 3, 2.01 / 111.195)
    ]);
    const outsidePeriod = groupProximityOccurrences([
      occurrence("current", 0),
      occurrence("near", 2, 0.001),
      occurrence("old", 14.01, 0.002)
    ]);

    expect(outsideRadius.groups).toHaveLength(0);
    expect(outsideRadius.individuals).toHaveLength(3);
    expect(outsidePeriod.groups).toHaveLength(0);
    expect(outsidePeriod.individuals).toHaveLength(3);
  });
});

describe("projeção da visão de proximidade", () => {
  it("projeta uma coordenada e coordenadas idênticas sem valores inválidos", () => {
    const single = projectCoordinates([{ id: "one", coordinates: { latitude: -9.97, longitude: -67.81 } }]);
    const identical = projectCoordinates([
      { id: "one", coordinates: { latitude: -9.97, longitude: -67.81 } },
      { id: "two", coordinates: { latitude: -9.97, longitude: -67.81 } }
    ]);

    expect(single.points[0]).toMatchObject({ x: 320, y: 180 });
    expect([...single.points, ...identical.points].every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(Number.isFinite(single.kmPerPixel)).toBe(true);
  });

  it("usa a mesma escala espacial nos eixos com várias coordenadas", () => {
    const result = projectCoordinates([
      { id: "origin", coordinates: { latitude: 0, longitude: 0 } },
      { id: "east", coordinates: { latitude: 0, longitude: 0.01 } },
      { id: "north", coordinates: { latitude: 0.01, longitude: 0 } }
    ]);
    const points = new Map(result.points.map((point) => [point.id, point]));
    const origin = points.get("origin")!;

    expect(Math.abs(points.get("east")!.x - origin.x)).toBeCloseTo(Math.abs(points.get("north")!.y - origin.y), 5);
    expect(result.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  it("respeita margens reservadas sem deformar a projeção", () => {
    const result = projectCoordinates(
      [{ id: "one", coordinates: { latitude: -9.97, longitude: -67.81 } }],
      { width: 640, height: 360, padding: { top: 96, right: 46, bottom: 86, left: 46 } }
    );

    expect(result.points[0]).toMatchObject({ x: 320, y: 185 });
  });
});
