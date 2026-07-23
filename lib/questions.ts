import type { MissingKey } from "./contracts";

export const questions: Record<MissingKey, { label: string; options: string[] }> = {
  burning_smell: { label: "Há cheiro de queimado?", options: ["Sim", "Não", "Não sei"] },
  people_nearby: { label: "Há pessoas próximas ou expostas?", options: ["Sim", "Não", "Não sei"] },
  water_use: { label: "Essa água é usada para beber, cozinhar ou tomar banho?", options: ["Sim", "Não", "Não sei"] },
  unusual_odor: { label: "Há odor forte ou incomum?", options: ["Sim", "Não", "Não sei"] },
  dumping_seen: { label: "Alguém viu o despejo acontecer?", options: ["Sim", "Não", "Não sei"] },
  recent_rain: { label: "Choveu forte recentemente?", options: ["Sim", "Não", "Não sei"] },
  affected_animals: { label: "Há animais mortos ou afetados?", options: ["Sim", "Não", "Não sei"] },
  hazardous_material: { label: "Há recipiente, rótulo ou material que pareça perigoso?", options: ["Sim", "Não", "Não sei"] },
  another_photo: { label: "Você consegue fazer outra foto, com mais luz e distância segura?", options: ["Sim", "Não", "Agora não"] }
};

export function questionsFor(keys: MissingKey[]) {
  return keys.slice(0, 3).map((key) => ({ key, ...questions[key] }));
}
