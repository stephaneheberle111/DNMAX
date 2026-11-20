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
      // Banc de comparaison lancé à la main (script Playwright en CommonJS, hors application) :
      // voir outils/banc/LISEZMOI.md.
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
  {
    // Décision 6 : `xlsx` 0.18.5 a deux failles connues à la LECTURE d'un classeur (pollution de
    // prototype, expression régulière coûteuse). L'application n'en écrit que : toute lecture est
    // refusée ici, pour qu'un futur import Excel ne puisse pas entrer sans rouvrir la décision.
    // Les tests relisent les classeurs qu'ils viennent de produire eux-mêmes : ils sont exemptés.
    files: ["src/**/*.ts", "outils/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            ":matches(MemberExpression[object.name='XLSX'], MemberExpression[object.property.name='XLSX'])[property.name=/^(read|readFile|readFileSync|stream)$/]",
          message:
            "Lecture d'un classeur avec xlsx 0.18.5 interdite : version vulnérable à la lecture (DECISIONS.md, décision 6). Changer d'abord de bibliothèque ou de version.",
        },
        {
          selector: "MemberExpression[property.name=/^sheet_to_/]",
          message:
            "Lecture d'un classeur avec xlsx 0.18.5 interdite : version vulnérable à la lecture (DECISIONS.md, décision 6). Changer d'abord de bibliothèque ou de version.",
        },
        {
          selector: "ImportDeclaration[source.value='xlsx'] ImportSpecifier[imported.name=/^(read|readFile|stream)$/]",
          message:
            "Lecture d'un classeur avec xlsx 0.18.5 interdite : version vulnérable à la lecture (DECISIONS.md, décision 6). Changer d'abord de bibliothèque ou de version.",
        },
      ],
    },
  },
);
