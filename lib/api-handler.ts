import { ZodError } from "zod";
import { analyzeRequestSchema, analyzeResponseSchema, MODEL, type AnalyzeRequest, type AnalyzeResponse } from "./contracts";
import { createGemmaProvider, type AnalyzeProvider } from "./gemma-provider";

const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 10;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const buckets = new Map<string, number[]>();

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function consumeRateLimit(ip: string, now: number) {
  const active = (buckets.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (active.length >= MAX_REQUESTS) return false;
  active.push(now);
  buckets.set(ip, active);
  return true;
}

export function resetRateLimitForTests() { buckets.clear(); }

function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const ownOrigin = new URL(request.url).origin;
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return origin === ownOrigin || allowed.includes(origin);
}

function validBase64(data: string) {
  return data.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(data);
}

function imageBytes(data: string) {
  return Math.floor(data.length * 3 / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
}

function signatureMatches(data: string, mimeType: AnalyzeRequest["image"]["mimeType"]) {
  const bytes = Buffer.from(data.slice(0, 24), "base64");
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" };
function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...extra } });
}

function isRetryable(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError) return true;
  const status = (error as { status?: number })?.status;
  return status === 408 || status === 429 || (typeof status === "number" && status >= 500);
}

export function createAnalyzeHandler(options: { provider?: AnalyzeProvider; now?: () => number; timeoutMs?: number } = {}) {
  return async function handle(request: Request) {
    const started = (options.now ?? Date.now)();
    const requestId = crypto.randomUUID();
    if (!validOrigin(request)) return json({ error: "Origem não permitida.", code: "INVALID_ORIGIN" }, 403);
    if (!consumeRateLimit(clientIp(request), started)) return json({ error: "Limite de 10 análises em 10 minutos atingido.", code: "RATE_LIMIT" }, 429, { "Retry-After": "600" });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "Envie JSON.", code: "INVALID_CONTENT_TYPE" }, 415);

    let input: AnalyzeRequest;
    try {
      input = analyzeRequestSchema.parse(await request.json());
      if (!validBase64(input.image.data)) return json({ error: "Imagem em base64 inválida.", code: "INVALID_IMAGE" }, 400);
      if (imageBytes(input.image.data) > MAX_IMAGE_BYTES) return json({ error: "A imagem deve ter no máximo 2 MB.", code: "IMAGE_TOO_LARGE" }, 413);
      if (!signatureMatches(input.image.data, input.image.mimeType)) return json({ error: "O conteúdo da imagem não corresponde ao MIME informado.", code: "INVALID_IMAGE_SIGNATURE" }, 400);
    } catch (error) {
      return json({ error: error instanceof ZodError ? "Dados inválidos para análise." : "JSON inválido.", code: "INVALID_REQUEST" }, 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey && !options.provider) return json({ error: "Análise ao vivo indisponível: GEMINI_API_KEY não configurada.", code: "MISSING_API_KEY" }, 503);
    const provider = options.provider ?? createGemmaProvider(apiKey!);
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
      try {
        const result = await provider(input, controller.signal);
        const finished = (options.now ?? Date.now)();
        const payload: AnalyzeResponse = {
          analysis: result.analysis,
          meta: { provider: "google-gemini-api", model: MODEL, mode: "hosted", durationMs: Math.max(0, finished - started), generatedAt: new Date(finished).toISOString(), ...(result.usage ? { tokenUsage: result.usage } : {}) }
        };
        const validated = analyzeResponseSchema.parse(payload);
        console.info(JSON.stringify({ event: "analysis_complete", requestId, durationMs: validated.meta.durationMs, category: validated.analysis.category }));
        return json(validated);
      } catch (error) {
        lastError = error;
        if ((error as { name?: string })?.name === "AbortError") {
          console.warn(JSON.stringify({ event: "analysis_timeout", requestId }));
          return json({ error: "A análise excedeu 60 segundos. Seus dados continuam no aparelho.", code: "TIMEOUT" }, 504);
        }
        if (attempt === 0 && isRetryable(error)) continue;
        break;
      } finally {
        clearTimeout(timeout);
      }
    }
    console.warn(JSON.stringify({ event: "analysis_failed", requestId, errorType: lastError instanceof ZodError ? "invalid_output" : "provider_error" }));
    return json({ error: "Não foi possível concluir a análise agora. Tente novamente sem perder o registro.", code: "PROVIDER_UNAVAILABLE" }, 502);
  };
}
