import { describe, expect, it } from "vitest";
import { questionsFor } from "@/lib/questions";

describe("perguntas controladas", () => {
  it("mapeia no máximo três chaves sem gerar texto livre", () => {
    const result = questionsFor(["burning_smell", "people_nearby", "recent_rain", "another_photo"]);
    expect(result).toHaveLength(3);
    expect(result.every((question) => question.options.length >= 3)).toBe(true);
  });
});
