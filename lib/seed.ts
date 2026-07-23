import type { Analysis, Occurrence, ProgressState } from "./contracts";

const analyses: Record<string, Analysis> = {
  fire_smoke: { category: "fire_smoke", confidence: "high", imageQuality: "good", observedSigns: [{ code: "smoke_visible", source: "image" }, { code: "burned_vegetation", source: "image" }], missingInformation: ["people_nearby", "burning_smell"], summary: "Fumaça e vegetação alterada são compatíveis com uma ocorrência de fogo.", uncertainties: ["A distância de moradias não está informada."] },
  water_contamination: { category: "water_contamination", confidence: "medium", imageQuality: "fair", observedSigns: [{ code: "unusual_water_color", source: "image" }, { code: "dead_fish", source: "report" }], missingInformation: ["water_use", "unusual_odor"], summary: "Há sinais que justificam verificar a qualidade da água.", uncertainties: ["A causa não pode ser confirmada por imagem."] },
  waste_disposal: { category: "waste_disposal", confidence: "high", imageQuality: "good", observedSigns: [{ code: "waste_accumulation", source: "both" }], missingInformation: ["hazardous_material"], summary: "Há acúmulo visível de resíduos em área aberta.", uncertainties: ["O tipo de material não está claro."] }
};

export function createSeedHistory(now = new Date()): Occurrence[] {
  const rows: Array<[number, keyof typeof analyses, number, number, ProgressState]> = [
    [2, "fire_smoke", -9.974, -67.812, "in_progress"], [5, "fire_smoke", -9.968, -67.806, "forwarded"],
    [9, "fire_smoke", -9.979, -67.817, "reviewed"], [18, "fire_smoke", -10.020, -67.900, "resolved"],
    [1, "water_contamination", -9.941, -67.833, "registered"], [7, "water_contamination", -9.947, -67.827, "reviewed"],
    [12, "water_contamination", -9.951, -67.837, "resolved"], [21, "water_contamination", -9.890, -67.750, "resolved"],
    [3, "waste_disposal", -9.961, -67.790, "registered"], [8, "waste_disposal", -9.956, -67.796, "forwarded"],
    [13, "waste_disposal", -9.966, -67.801, "in_progress"], [25, "waste_disposal", -10.040, -67.910, "resolved"]
  ];
  return rows.map(([days, category, latitude, longitude, progress], index) => {
    const observed = new Date(now.getTime() - days * 86_400_000);
    return {
      id: `demo-${index + 1}`,
      createdAt: observed.toISOString(), observedAt: observed.toISOString(),
      report: `Ocorrência fictícia ${index + 1} para demonstração de recorrência.`,
      placeDescription: "Local simulado — Rio Branco, AC", coordinates: { latitude, longitude },
      localPhotoPresent: false, analysisState: "analyzed", progress, analysis: analyses[category], answers: {},
      attention: category === "fire_smoke" ? "Precisa de atenção" : "Acompanhe e registre"
    };
  });
}
