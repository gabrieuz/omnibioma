import { describe, expect, it } from "vitest";
import { attentionFor } from "@/lib/rules";
import type { Analysis } from "@/lib/contracts";

const base: Analysis = { category: "fire_smoke", confidence: "medium", imageQuality: "good", observedSigns: [{ code: "smoke_visible", source: "image" }], missingInformation: [], summary: "Há um sinal visual de fumaça na área.", uncertainties: [] };

describe("regras de atenção", () => {
  it("pede evidência quando imagem é ruim, incerta ou fora do escopo", () => {
    expect(attentionFor({ ...base, imageQuality: "poor" })).toBe("Precisamos de mais informações");
    expect(attentionFor({ ...base, category: "uncertain" })).toBe("Precisamos de mais informações");
  });
  it("marca chamas, peixes mortos e exposição como atenção rápida", () => {
    expect(attentionFor({ ...base, observedSigns: [{ code: "flame_visible", source: "image" }] })).toBe("Atenção rápida");
    expect(attentionFor({ ...base, category: "water_contamination", observedSigns: [{ code: "dead_fish", source: "image" }] })).toBe("Atenção rápida");
    expect(attentionFor(base, { people_nearby: "Sim" })).toBe("Atenção rápida");
  });
  it("mantém caso plausível sem sinal crítico abaixo de rápido", () => expect(attentionFor(base)).toBe("Acompanhe e registre"));
});
