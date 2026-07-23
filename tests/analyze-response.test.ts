import { describe, expect, it } from "vitest";
import { readAnalyzeResponse } from "@/lib/analyze-response";

const validResponse = {
  analysis: {
    category: "fire_smoke",
    confidence: "medium",
    imageQuality: "good",
    observedSigns: [{ code: "smoke_visible", source: "both" }],
    missingInformation: ["people_nearby"],
    summary: "Há fumaça visível compatível com o relato apresentado.",
    uncertainties: []
  },
  meta: {
    provider: "google-gemini-api",
    model: "gemma-4-26b-a4b-it",
    mode: "hosted",
    durationMs: 120,
    generatedAt: "2026-07-23T12:00:00.000Z"
  }
};

describe("resposta HTTP da análise", () => {
  it("troca respostas de texto do servidor por uma mensagem compreensível", async () => {
    const response = new Response("An error occurred with your deployment", { status: 500 });
    await expect(readAnalyzeResponse(response)).rejects.toMatchObject({
      message: "O serviço de análise está indisponível no momento. Tente novamente.",
      code: "INVALID_SERVER_RESPONSE"
    });
  });

  it("preserva mensagens e códigos de erro JSON da API", async () => {
    const response = Response.json({ error: "Chave não configurada.", code: "MISSING_API_KEY" }, { status: 503 });
    await expect(readAnalyzeResponse(response)).rejects.toMatchObject({ message: "Chave não configurada.", code: "MISSING_API_KEY" });
  });

  it("aceita apenas respostas de sucesso que cumpram o contrato", async () => {
    await expect(readAnalyzeResponse(Response.json(validResponse))).resolves.toMatchObject(validResponse);
    await expect(readAnalyzeResponse(Response.json({ analysis: {} }))).rejects.toMatchObject({ code: "INVALID_ANALYSIS_RESPONSE" });
  });
});
