import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalyzeHandler, resetRateLimitForTests } from "@/lib/api-handler";
import type { Analysis } from "@/lib/contracts";

const analysis: Analysis = { category: "fire_smoke", confidence: "medium", imageQuality: "good", observedSigns: [{ code: "smoke_visible", source: "both" }], missingInformation: ["people_nearby"], summary: "Há fumaça visível compatível com a ocorrência relatada.", uncertainties: [] };
const validBody = { image: { mimeType: "image/jpeg", data: "/9j/4AAQSkZJRgAB" }, report: "Há fumaça sobre a vegetação." };
const request = (body: unknown = validBody, headers: Record<string, string> = {}) => new Request("https://app.test/api/analyze", { method: "POST", headers: { "content-type": "application/json", origin: "https://app.test", ...headers }, body: JSON.stringify(body) });
let originalKey: string | undefined;

beforeEach(() => { resetRateLimitForTests(); originalKey = process.env.GEMINI_API_KEY; });
afterEach(() => { if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; });

describe("POST /api/analyze", () => {
  it("retorna contrato e metadados com provedor falso", async () => {
    const response = await createAnalyzeHandler({ provider: async () => ({ analysis }), now: () => Date.parse("2026-07-22T12:00:00Z") })(request());
    expect(response.status).toBe(200); expect((await response.json()).meta.model).toBe("gemma-4-26b-a4b-it");
  });
  it("falha de forma explícita sem chave", async () => { delete process.env.GEMINI_API_KEY; const response = await createAnalyzeHandler()(request()); expect(response.status).toBe(503); });
  it("recusa MIME inválido e imagem maior que 2 MB", async () => {
    const provider = async () => ({ analysis });
    expect((await createAnalyzeHandler({ provider })(request({ ...validBody, image: { mimeType: "image/gif", data: validBody.image.data } }))).status).toBe(400);
    resetRateLimitForTests();
    expect((await createAnalyzeHandler({ provider })(request({ ...validBody, image: { mimeType: "image/jpeg", data: "a".repeat(2_796_204) } }))).status).toBe(413);
  });
  it("recusa assinatura de arquivo divergente do MIME", async () => {
    const response = await createAnalyzeHandler({ provider: async () => ({ analysis }) })(request({ ...validBody, image: { mimeType: "image/png", data: validBody.image.data } }));
    expect(response.status).toBe(400); expect((await response.json()).code).toBe("INVALID_IMAGE_SIGNATURE");
  });
  it("aplica timeout", async () => {
    const provider = (_input: unknown, signal: AbortSignal) => new Promise<never>((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    const response = await createAnalyzeHandler({ provider, timeoutMs: 5 })(request()); expect(response.status).toBe(504);
  });
  it("limita 10 análises por IP em 10 minutos", async () => {
    const handler = createAnalyzeHandler({ provider: async () => ({ analysis }) });
    for (let index = 0; index < 10; index += 1) expect((await handler(request(validBody, { "x-forwarded-for": "203.0.113.4" }))).status).toBe(200);
    expect((await handler(request(validBody, { "x-forwarded-for": "203.0.113.4" }))).status).toBe(429);
  });
  it("repete uma vez em JSON inválido e aceita a segunda resposta", async () => {
    const provider = vi.fn().mockRejectedValueOnce(new SyntaxError("json")).mockResolvedValueOnce({ analysis });
    expect((await createAnalyzeHandler({ provider })(request())).status).toBe(200); expect(provider).toHaveBeenCalledTimes(2);
  });
  it("não faz terceira tentativa quando o provedor segue indisponível", async () => {
    const error = Object.assign(new Error("indisponível"), { status: 503 }); const provider = vi.fn().mockRejectedValue(error);
    expect((await createAnalyzeHandler({ provider })(request())).status).toBe(502); expect(provider).toHaveBeenCalledTimes(2);
  });
  it("recusa origem diferente", async () => { const response = await createAnalyzeHandler({ provider: async () => ({ analysis }) })(request(validBody, { origin: "https://evil.test" })); expect(response.status).toBe(403); });
});
