import type { Analysis, AnalyzeResponse } from "./contracts";

export interface Scenario {
  id: string;
  title: string;
  kicker: string;
  report: string;
  image: string;
  confidenceTest: boolean;
}

export const scenarios: Scenario[] = [
  { id: "01_queimada", title: "Queimada na vegetação", kicker: "Fogo e fumaça", report: "Há muita fumaça e uma linha de fogo avançando sobre a vegetação. Não sei se existem casas próximas.", image: "/scenarios/01_queimada/image.jpg", confidenceTest: false },
  { id: "02_agua_contaminada", title: "Peixes mortos no rio", kicker: "Qualidade da água", report: "Foram encontrados vários peixes mortos e a água parece mais escura que o normal.", image: "/scenarios/02_agua_contaminada/image.jpg", confidenceTest: false },
  { id: "03_descarte_residuos", title: "Resíduos acumulados", kicker: "Descarte irregular", report: "Há muito plástico e lixo acumulado na água, perto de casas e de uma passagem usada pela comunidade.", image: "/scenarios/03_descarte_residuos/image.jpg", confidenceTest: false },
  { id: "04_neblina_ambigua", title: "Fumaça ou neblina?", kicker: "Teste de incerteza", report: "A área está coberta por uma névoa branca. Não há cheiro de queimado e não foram vistas chamas.", image: "/scenarios/04_neblina_ambigua/image.jpg", confidenceTest: true },
  { id: "05_agua_barrenta", title: "Água barrenta após chuva", kicker: "Possível falso positivo", report: "O rio ficou marrom depois de uma chuva forte. Não há odor, espuma ou animais mortos.", image: "/scenarios/05_agua_barrenta/image.jpg", confidenceTest: true },
  { id: "06_evidencia_insuficiente", title: "Evidência insuficiente", kicker: "Foto degradada", report: "Encontrei algo estranho perto da água, mas a foto ficou ruim.", image: "/scenarios/06_evidencia_insuficiente/image.jpg", confidenceTest: true }
];

export async function loadScenarioSnapshot(id: string): Promise<{ analysis: Analysis; meta: AnalyzeResponse["meta"] & { snapshot: true; provenance?: string } }> {
  const response = await fetch(`/scenarios/${id}/expected_output.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("Snapshot de demonstração indisponível.");
  return response.json();
}
