import { beforeEach, describe, expect, it } from "vitest";
import { clearOccurrencesForTests, listOccurrences, listQueued, saveOccurrence } from "@/lib/db";
import { exportOccurrence } from "@/lib/export";
import type { Occurrence } from "@/lib/contracts";

const item: Occurrence = { id: "test-1", createdAt: "2026-07-22T12:00:00.000Z", observedAt: "2026-07-22T12:00:00.000Z", report: "Relato ambiental de teste.", placeDescription: "Local", photoDataUrl: "data:image/jpeg;base64,aaaa", localPhotoPresent: true, analysisState: "queued", progress: "registered", answers: {} };

describe("IndexedDB e exportação", () => {
  beforeEach(clearOccurrencesForTests);
  it("persiste e consulta a fila", async () => { await saveOccurrence(item); expect(await listQueued()).toHaveLength(1); expect(await listOccurrences()).toHaveLength(1); });
  it("exporta indicador sem incorporar foto", () => { const output = exportOccurrence(item); expect(output.localPhotoPresent).toBe(true); expect(output).not.toHaveProperty("photoDataUrl"); expect(JSON.stringify(output)).not.toContain("base64"); });
});
