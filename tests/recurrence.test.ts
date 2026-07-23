import { describe, expect, it } from "vitest";
import { findRecurrence, haversineKm, roundCoordinates } from "@/lib/recurrence";
import type { Occurrence } from "@/lib/contracts";

const analysis = { category: "waste_disposal", confidence: "high", imageQuality: "good", observedSigns: [{ code: "waste_accumulation", source: "both" }], missingInformation: [], summary: "Resíduos acumulados foram observados no local.", uncertainties: [] } as const;
const occurrence = (id: string, days: number, latitude: number): Occurrence => ({ id, createdAt: new Date(Date.UTC(2026, 6, 22) - days * 86_400_000).toISOString(), observedAt: new Date(Date.UTC(2026, 6, 22) - days * 86_400_000).toISOString(), report: "Relato de resíduos acumulados.", placeDescription: "Teste", coordinates: { latitude, longitude: -67.81 }, localPhotoPresent: false, analysisState: "analyzed", progress: "registered", analysis: { ...analysis, observedSigns: [...analysis.observedSigns], missingInformation: [...analysis.missingInformation], uncertainties: [...analysis.uncertainties] }, answers: {} });

describe("proximidade e recorrência", () => {
  it("calcula Haversine e arredonda coordenadas", () => {
    expect(haversineKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.19, 1);
    expect(roundCoordinates({ latitude: -9.97049, longitude: -67.81051 })).toEqual({ latitude: -9.97, longitude: -67.811 });
  });
  it("exige dois registros anteriores em até 2 km e 14 dias", () => {
    const current = occurrence("now", 0, -9.97);
    expect(findRecurrence(current, [occurrence("one", 2, -9.971)]).found).toBe(false);
    const result = findRecurrence(current, [occurrence("one", 2, -9.971), occurrence("two", 14, -9.987)]);
    expect(result.found).toBe(true);
    expect(result.count).toBe(2);
    expect(result.recurringSigns).toContain("waste_accumulation");
  });
  it("exclui distância e período acima dos limites", () => {
    const current = occurrence("now", 0, -9.97);
    expect(findRecurrence(current, [occurrence("far", 2, -10.05), occurrence("old", 15, -9.971)]).count).toBe(0);
  });
});
