import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createGemmaProvider } from "../lib/gemma-provider";
import { MODEL } from "../lib/contracts";

try { process.loadEnvFile(path.resolve(".env")); } catch { /* environment may already contain the key */ }
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY não configurada.");

const folders = ["01_queimada", "02_agua_contaminada", "03_descarte_residuos", "04_neblina_ambigua", "05_agua_barrenta", "06_evidencia_insuficiente"];
const provider = createGemmaProvider(key);

for (const folder of folders) {
  const base = path.join("data", "scenarios", folder);
  try {
    const existing = JSON.parse(await readFile(path.join(base, "expected_output.json"), "utf8"));
    if (existing.meta?.provenance === "live_gemini_interactions_api_store_false" && !process.argv.includes("--force")) {
      console.log(`${folder}: snapshot ao vivo já existe; preservado`);
      continue;
    }
  } catch { /* generate missing or invalid snapshot */ }
  const [seed, image] = await Promise.all([readFile(path.join(base, "scenario_seed.json"), "utf8").then(JSON.parse), readFile(path.join(base, "image.jpg"))]);
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    let result;
    try {
      result = await provider({ image: { mimeType: "image/jpeg", data: image.toString("base64") }, report: seed.simulated_report }, controller.signal);
    } catch (firstError) {
      if (controller.signal.aborted) throw firstError;
      result = await provider({ image: { mimeType: "image/jpeg", data: image.toString("base64") }, report: seed.simulated_report }, controller.signal);
    }
    const output = { analysis: result.analysis, meta: { provider: "google-gemini-api", model: MODEL, mode: "hosted", durationMs: Date.now() - started, generatedAt: new Date().toISOString(), snapshot: true, provenance: "live_gemini_interactions_api_store_false", ...(result.usage ? { tokenUsage: result.usage } : {}) } };
    await writeFile(path.join(base, "expected_output.json"), `${JSON.stringify(output, null, 2)}\n`);
    console.log(`${folder}: ${result.analysis.category} (${result.analysis.confidence}) em ${output.meta.durationMs} ms`);
  } finally { clearTimeout(timer); }
}
