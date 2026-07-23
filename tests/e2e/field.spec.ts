import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apiResult = { analysis: { category: "fire_smoke", confidence: "high", imageQuality: "good", observedSigns: [{ code: "flame_visible", source: "both" }, { code: "smoke_visible", source: "both" }], missingInformation: ["people_nearby"], summary: "Há chamas e fumaça visíveis sobre a vegetação.", uncertainties: ["A proximidade de pessoas precisa ser confirmada."] }, meta: { provider: "google-gemini-api", model: "gemma-4-26b-a4b-it", mode: "hosted", durationMs: 840, generatedAt: "2026-07-22T12:00:00.000Z" } };

test("home sem violações WCAG A/AA automatizadas e sem rolagem a 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("fluxo completo, recorrência, status e exportação", async ({ page }) => {
  await page.route("**/api/analyze", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(apiResult) }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entenda o sinal. Aja com cuidado." })).toBeVisible();
  await page.getByRole("button", { name: /Queimada na vegetação/ }).click();
  await expect(page.getByRole("button", { name: "Analisar" })).toBeEnabled();
  await page.getByRole("button", { name: "Analisar" }).click();
  await expect(page.getByRole("heading", { name: "O que a evidência sugere" })).toBeVisible();
  await page.getByLabel("Sim").check();
  await page.getByRole("button", { name: /Ver orientação/ }).click();
  await expect(page.getByText("Atenção rápida", { exact: true })).toBeVisible();
  await expect(page.getByText("Possível recorrência próxima")).toBeVisible();
  await page.getByRole("button", { name: /Salvar ocorrência/ }).click();
  await page.getByRole("button", { name: /Ver histórico/ }).click();
  await expect(page.getByRole("heading", { name: "Visão de proximidade" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar JSON/ }).click();
  expect((await download).suggestedFilename()).toContain("omnibioma-field");
});

test("fila offline preserva o registro", async ({ page, context }) => {
  await page.goto("/");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Registrar", exact: true }).first().click();
  await page.locator('input[type="file"]').setInputFiles("data/scenarios/06_evidencia_insuficiente/image.jpg");
  await page.getByPlaceholder(/vi fumaça/).fill("Relato preenchido enquanto estou sem conexão.");
  await page.getByRole("button", { name: "Analisar" }).click();
  await expect(page.getByText(/análise colocada na fila/i)).toBeVisible();
  await page.getByRole("button", { name: "Histórico" }).click();
  await expect(page.getByText("Aguardando conexão")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Entenda o sinal. Aja com cuidado." })).toBeVisible();
  await context.setOffline(false);
});
