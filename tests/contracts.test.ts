import { describe, expect, it } from "vitest";
import { analysisSchema, analyzeRequestSchema } from "@/lib/contracts";

const analysis = { category: "fire_smoke", confidence: "high", imageQuality: "good", observedSigns: [{ code: "smoke_visible", source: "both" }], missingInformation: ["people_nearby"], summary: "Fumaça visível na vegetação observada.", uncertainties: [] };

describe("contratos", () => {
  it("aceita uma análise controlada", () => expect(analysisSchema.parse(analysis).category).toBe("fire_smoke"));
  it("recusa mais de três lacunas", () => expect(() => analysisSchema.parse({ ...analysis, missingInformation: ["people_nearby", "water_use", "recent_rain", "another_photo"] })).toThrow());
  it("recusa categorias e MIME livres", () => {
    expect(() => analysisSchema.parse({ ...analysis, category: "crime" })).toThrow();
    expect(() => analyzeRequestSchema.parse({ image: { mimeType: "image/gif", data: "aaaa" }, report: "relato válido aqui" })).toThrow();
  });
});
