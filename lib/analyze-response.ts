import { analyzeResponseSchema, type AnalyzeResponse } from "./contracts";

type AnalyzeError = Error & { code?: string };

function clientError(message: string, code: string): AnalyzeError {
  const error = new Error(message) as AnalyzeError;
  error.code = code;
  return error;
}

export async function readAnalyzeResponse(response: Response): Promise<AnalyzeResponse> {
  const raw = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    throw clientError(
      response.ok
        ? "O servidor devolveu uma resposta inválida. Tente novamente."
        : "O serviço de análise está indisponível no momento. Tente novamente.",
      "INVALID_SERVER_RESPONSE"
    );
  }

  if (!response.ok) {
    const body = payload && typeof payload === "object" ? payload as { error?: unknown; code?: unknown } : {};
    throw clientError(
      typeof body.error === "string" ? body.error : "A análise falhou. Tente novamente.",
      typeof body.code === "string" ? body.code : "ANALYSIS_FAILED"
    );
  }

  const parsed = analyzeResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw clientError("O servidor devolveu uma análise incompleta. Tente novamente.", "INVALID_ANALYSIS_RESPONSE");
  }
  return parsed.data;
}
