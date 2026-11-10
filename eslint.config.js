// SPDX-License-Identifier: AGPL-3.0-or-later
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "src-tauri/",
      // Interface historique reprise telle quelle (environ 7 800 lignes de JavaScript non typé).
      // Elle est exclue en bloc en attendant sa reprise progressive en TypeScript : voir DECISIONS.md.
      "public/heritage/",
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
