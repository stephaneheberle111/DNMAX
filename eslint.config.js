// SPDX-License-Identifier: CECILL-2.1
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "src-tauri/",
      // Banc de comparaison lancé à la main pendant la reprise (script Playwright en CommonJS, hors
      // application) : voir docs/reprise.md. Ce qu'il appelle dans la page est publié par src/heritage/noms-banc.ts.
      "outils/banc/",
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["eslint.config.js"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
