import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"], exclude: ["tests/e2e/**", "node_modules/**", ".next/**"], coverage: { reporter: ["text", "html"] } },
  resolve: { alias: { "@": path.resolve(directory, ".") } }
});
