// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig } from "vitest/config";

const PORT_DEVELOPPEMENT = 1420;

export default defineConfig({
  // Tauri affiche ses propres erreurs Rust dans le même terminal : ne pas les effacer.
  clearScreen: false,
  server: {
    port: PORT_DEVELOPPEMENT,
    // L'enveloppe de bureau pointe sur ce port précis : mieux vaut échouer que d'en changer en silence.
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    include: ["src/**/*.test.ts", "outils/**/*.test.ts"],
  },
});
