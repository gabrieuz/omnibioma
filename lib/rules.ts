import guidance from "@/data/guidance.json";
import type { Analysis, Attention, Category, MissingKey } from "./contracts";

const yes = (answers: Partial<Record<MissingKey, string>>, key: MissingKey) => answers[key] === "Sim";

export function attentionFor(analysis: Analysis, answers: Partial<Record<MissingKey, string>> = {}): Attention {
  if (analysis.category === "uncertain" || analysis.category === "out_of_scope" || analysis.confidence === "low" || analysis.imageQuality === "poor") {
    return "Precisamos de mais informações";
  }

  const signs = new Set(analysis.observedSigns.map(({ code }) => code));
  const rapid =
    signs.has("flame_visible") || signs.has("dead_fish") || signs.has("waste_burning") || signs.has("hazardous_material") ||
    (signs.has("smoke_visible") && (signs.has("people_exposed") || yes(answers, "people_nearby"))) ||
    (analysis.category === "water_contamination" && yes(answers, "water_use")) ||
    yes(answers, "hazardous_material") || yes(answers, "affected_animals");

  if (rapid) return "Atenção rápida";
  if (analysis.confidence === "high" || analysis.observedSigns.length >= 2) return "Precisa de atenção";
  return "Acompanhe e registre";
}

export function guidanceFor(category: Category) {
  return guidance[category];
}

export const categoryLabel: Record<Category, string> = {
  fire_smoke: "Fogo ou fumaça",
  water_contamination: "Possível contaminação da água",
  waste_disposal: "Descarte de resíduos",
  uncertain: "Situação incerta",
  out_of_scope: "Fora do escopo"
};

export const confidenceLabel = { low: "baixa", medium: "média", high: "alta" } as const;

export const signLabel: Record<string, string> = {
  flame_visible: "chamas visíveis", smoke_visible: "fumaça visível", burned_vegetation: "vegetação queimada",
  people_exposed: "pessoas expostas", dead_fish: "peixes mortos", unusual_water_color: "cor incomum na água",
  foam_on_water: "espuma na água", strong_odor: "odor forte", waste_accumulation: "resíduos acumulados",
  hazardous_material: "material possivelmente perigoso", waste_burning: "resíduos queimando", poor_visibility: "baixa visibilidade",
  sediment_after_rain: "sedimento após chuva", no_clear_sign: "nenhum sinal conclusivo"
};
