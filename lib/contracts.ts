import { z } from "zod";

export const MODEL = "gemma-4-26b-a4b-it" as const;
export const categories = ["fire_smoke", "water_contamination", "waste_disposal", "uncertain", "out_of_scope"] as const;
export const missingKeys = [
  "burning_smell", "people_nearby", "water_use", "unusual_odor", "dumping_seen",
  "recent_rain", "affected_animals", "hazardous_material", "another_photo"
] as const;
export const signCodes = [
  "flame_visible", "smoke_visible", "burned_vegetation", "people_exposed", "dead_fish",
  "unusual_water_color", "foam_on_water", "strong_odor", "waste_accumulation",
  "hazardous_material", "waste_burning", "poor_visibility", "sediment_after_rain", "no_clear_sign"
] as const;

export const analysisSchema = z.object({
  category: z.enum(categories),
  confidence: z.enum(["low", "medium", "high"]),
  imageQuality: z.enum(["poor", "fair", "good"]),
  observedSigns: z.array(z.object({
    code: z.enum(signCodes),
    source: z.enum(["image", "report", "both"])
  })).max(12),
  missingInformation: z.array(z.enum(missingKeys)).max(3),
  summary: z.string().min(10).max(420),
  uncertainties: z.array(z.string().min(1).max(180)).max(5)
}).strict();

export const analyzeRequestSchema = z.object({
  image: z.object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    data: z.string().min(16)
  }).strict(),
  report: z.string().trim().min(10).max(1200)
}).strict();

export const analyzeResponseSchema = z.object({
  analysis: analysisSchema,
  meta: z.object({
    provider: z.literal("google-gemini-api"),
    model: z.literal(MODEL),
    mode: z.literal("hosted"),
    durationMs: z.number().nonnegative(),
    generatedAt: z.string().datetime(),
    tokenUsage: z.record(z.unknown()).optional()
  }).strict()
}).strict();

export type Analysis = z.infer<typeof analysisSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type Category = Analysis["category"];
export type MissingKey = (typeof missingKeys)[number];
export type AnalysisState = "draft" | "queued" | "analyzing" | "analyzed" | "failed";
export type ProgressState = "registered" | "reviewed" | "forwarded" | "in_progress" | "resolved";
export type Attention = "Precisamos de mais informações" | "Acompanhe e registre" | "Precisa de atenção" | "Atenção rápida";

export interface Coordinates { latitude: number; longitude: number }

export interface Occurrence {
  id: string;
  createdAt: string;
  observedAt: string;
  report: string;
  placeDescription: string;
  coordinates?: Coordinates;
  photoDataUrl?: string;
  localPhotoPresent: boolean;
  analysisState: AnalysisState;
  progress: ProgressState;
  analysis?: Analysis;
  analysisMeta?: AnalyzeResponse["meta"] & { snapshot?: boolean; scenarioId?: string };
  answers: Partial<Record<MissingKey, string>>;
  attention?: Attention;
  error?: string;
}

export const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: categories, description: "Classificação preliminar da ocorrência." },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    imageQuality: { type: "string", enum: ["poor", "fair", "good"] },
    observedSigns: {
      type: "array", maxItems: 12,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          code: { type: "string", enum: signCodes },
          source: { type: "string", enum: ["image", "report", "both"] }
        },
        required: ["code", "source"]
      }
    },
    missingInformation: { type: "array", maxItems: 3, items: { type: "string", enum: missingKeys } },
    summary: { type: "string", description: "Resumo factual e cauteloso em português, até 3 frases." },
    uncertainties: { type: "array", maxItems: 5, items: { type: "string" } }
  },
  required: ["category", "confidence", "imageQuality", "observedSigns", "missingInformation", "summary", "uncertainties"]
} as const;
