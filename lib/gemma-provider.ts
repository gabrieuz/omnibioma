import { analysisJsonSchema, analysisSchema, MODEL, type Analysis, type AnalyzeRequest } from "./contracts";

export interface ProviderResult { analysis: Analysis; usage?: Record<string, unknown> }
export type AnalyzeProvider = (request: AnalyzeRequest, signal: AbortSignal) => Promise<ProviderResult>;
let thinkingLevel: "minimal" | "low" | "none" = "minimal";
let outputMode: "response_format" | "function_call" | "plain_json" = "response_format";

const SYSTEM_INSTRUCTION = `Você auxilia uma triagem ambiental preliminar. Analise somente a imagem e o relato enviados. Responda em português, com linguagem factual e cautelosa. Não dê diagnóstico, instruções de combate, contatos nem recomendações. Não presuma localização. Se a imagem for ruim, conflitar com o relato ou não trouxer evidência suficiente, use baixa confiança, categoria uncertain e peça outra foto. Neblina sem cheiro ou chamas não deve virar incêndio com alta confiança. Água barrenta após chuva sem odor, espuma ou animais afetados não deve virar contaminação com alta confiança. Use somente os códigos permitidos pelo schema.`;

function textFromInteraction(value: unknown): string {
  if (!value || typeof value !== "object") throw new Error("Resposta vazia do provedor.");
  const interaction = value as { steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  const parts = interaction.steps?.filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []) ?? [];
  const text = parts.filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
  if (!text) {
    const diagnostic = interaction.steps?.map((step) => ({ type: step.type, contentTypes: step.content?.map((part) => part.type) })) ?? [];
    throw new SyntaxError(`O provedor não devolveu texto estruturado. Etapas: ${JSON.stringify(diagnostic)}`);
  }
  return text;
}

function analysisFromInteraction(value: unknown): Analysis {
  if (!value || typeof value !== "object") throw new Error("Resposta vazia do provedor.");
  const interaction = value as { steps?: Array<{ type?: string; name?: string; arguments?: unknown }> };
  const call = interaction.steps?.find((step) => step.type === "function_call" && step.name === "submit_environmental_analysis");
  if (call?.arguments) {
    return analysisSchema.parse(typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments);
  }
  const text = textFromInteraction(value).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return analysisSchema.parse(JSON.parse(start >= 0 && end >= start ? text.slice(start, end + 1) : text));
}

export function createGemmaProvider(apiKey: string, fetcher: typeof fetch = fetch): AnalyzeProvider {
  return async (request, signal) => {
    const send = (level: "minimal" | "low" | "none") => {
      const structured = outputMode === "response_format"
        ? { response_format: { type: "text", mime_type: "application/json", schema: analysisJsonSchema } }
        : outputMode === "function_call"
          ? { tools: [{ type: "function", name: "submit_environmental_analysis", description: "Entrega a análise ambiental preliminar no contrato exigido.", parameters: analysisJsonSchema }] }
          : {};
      return fetcher("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal,
      body: JSON.stringify({
        model: MODEL,
        store: false,
        system_instruction: SYSTEM_INSTRUCTION,
        input: [
          { type: "text", text: `${outputMode === "plain_json" ? `Retorne somente um objeto JSON válido que cumpra exatamente este schema, sem markdown:\n${JSON.stringify(analysisJsonSchema)}\n\n` : ""}Relato da pessoa em campo:\n${request.report}` },
          { type: "image", data: request.image.data, mime_type: request.image.mimeType, resolution: "medium" }
        ],
        generation_config: { temperature: 0.15, max_output_tokens: 1800, ...(level === "none" ? {} : { thinking_level: level, thinking_summaries: "none" }), ...(outputMode === "function_call" ? { tool_choice: "any" } : {}) },
        ...structured
      })
    });
    };
    let response = await send(thinkingLevel);
    if (!response.ok && thinkingLevel === "minimal") {
      let unsupported = false;
      try {
        const payload = await response.clone().json() as { error?: { message?: string } };
        unsupported = response.status === 400 && Boolean(payload.error?.message?.includes("not a supported thinking level"));
      } catch { /* handled by the regular error path */ }
      if (unsupported) {
        thinkingLevel = "low";
        response = await send(thinkingLevel);
      }
    }
    if (!response.ok && thinkingLevel === "low") {
      let unsupportedBudget = false;
      try {
        const payload = await response.clone().json() as { error?: { message?: string } };
        unsupportedBudget = response.status === 400 && Boolean(payload.error?.message?.includes("Thinking budget is not supported"));
      } catch { /* handled by the regular error path */ }
      if (unsupportedBudget) {
        thinkingLevel = "none";
        response = await send(thinkingLevel);
      }
    }
    if (!response.ok && response.status === 400 && outputMode === "response_format") {
      let unsupportedFormat = false;
      try {
        const payload = await response.clone().json() as { error?: { message?: string } };
        unsupportedFormat = payload.error?.message === "Request contains an invalid argument.";
      } catch { /* handled by the regular error path */ }
      if (unsupportedFormat) {
        outputMode = "function_call";
        response = await send(thinkingLevel);
      }
    }
    if (!response.ok && response.status === 400 && outputMode === "function_call") {
      let unsupportedTool = false;
      try {
        const payload = await response.clone().json() as { error?: { message?: string } };
        unsupportedTool = payload.error?.message === "Request contains an invalid argument.";
      } catch { /* handled by the regular error path */ }
      if (unsupportedTool) {
        outputMode = "plain_json";
        response = await send(thinkingLevel);
      }
    }
    if (!response.ok) {
      let detail = "";
      try {
        const payload = await response.json() as { error?: { message?: string } };
        detail = payload.error?.message ? ` ${payload.error.message}` : "";
      } catch { /* never log the request body */ }
      const error = new Error(`Gemini API respondeu ${response.status}.${detail}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    const raw = await response.json() as { usage?: Record<string, unknown> };
    const parsed = analysisFromInteraction(raw);
    return { analysis: parsed, usage: raw.usage };
  };
}
