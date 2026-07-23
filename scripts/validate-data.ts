import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { analysisSchema, MODEL } from "../lib/contracts";

const manifest = JSON.parse(await readFile("data/manifest.json", "utf8")) as Array<Record<string, string>>;
if (manifest.length !== 6) throw new Error("O manifesto deve conter seis cenários.");

for (const entry of manifest) {
  for (const key of ["image", "scenario_seed", "attribution", "expected_output", "alternative_sources"]) {
    if (!entry[key] || !existsSync(`data/${entry[key]}`)) throw new Error(`${entry.scenario}: ${key} ausente.`);
  }
  const attribution = JSON.parse(await readFile(`data/${entry.attribution}`, "utf8"));
  const image = await readFile(`data/${entry.image}`);
  const hash = createHash("sha256").update(image).digest("hex");
  if (hash !== attribution.sha256) throw new Error(`${entry.scenario}: hash da imagem divergente.`);
  if (!attribution.license || !attribution.source_page) throw new Error(`${entry.scenario}: licença ou fonte ausente.`);
  const alternatives = JSON.parse(await readFile(`data/${entry.alternative_sources}`, "utf8"));
  if (!alternatives.every((item: Record<string, unknown>) => item.status === "candidate_only" && item.verification === "unverified" && item.has_local_image === false)) throw new Error(`${entry.scenario}: fonte alternativa não está isolada.`);
  const snapshot = JSON.parse(await readFile(`data/${entry.expected_output}`, "utf8"));
  analysisSchema.parse(snapshot.analysis);
  if (snapshot.meta.model !== MODEL || snapshot.meta.provider !== "google-gemini-api") throw new Error(`${entry.scenario}: proveniência de snapshot inválida.`);
}
console.log("Dados, hashes, licenças, fontes alternativas e snapshots: válidos.");
