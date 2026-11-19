// SPDX-License-Identifier: CECILL-2.1
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const IDENTITE = readFileSync(new URL("./identite.css", import.meta.url), "utf8");
const APPLICATION = readFileSync(new URL("../public/heritage/application.css", import.meta.url), "utf8");

/** Luminance relative (WCAG) d'une couleur `#rrggbb`. */
function luminance(couleur: string): number {
  const canaux = [1, 3, 5].map((debut) => Number.parseInt(couleur.slice(debut, debut + 2), 16) / 255);
  const [rouge = 0, vert = 0, bleu = 0] = canaux.map((canal) => (canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rouge + 0.7152 * vert + 0.0722 * bleu;
}

/** Couleur du papier pour une teinte, en clair ou dans le thème sombre choisi. */
function papier(teinte: string, theme: "clair" | "sombre"): string {
  const selecteur = theme === "clair" ? `:root[data-teinte="${teinte}"] {` : `:root[data-teinte="${teinte}"][data-theme="dark"] {`;
  const ligne = IDENTITE.split("\n").find((candidate) => candidate.startsWith(selecteur));
  return /--paper: (#[0-9a-f]{6})/i.exec(ligne ?? "")?.[1] ?? "";
}

/** Teinte « normale » et surface des cartes, données par application.css. */
function variable(nom: string, theme: "clair" | "sombre"): string {
  const valeurs = [...APPLICATION.matchAll(new RegExp(`--${nom}:(#[0-9A-Fa-f]{6})`, "g"))].map((trouvee) => trouvee[1] ?? "");
  return (theme === "clair" ? valeurs[0] : valeurs[1]) ?? "";
}

/** Écart de luminance entre le papier et les cartes posées dessus : ce que l'œil lit comme l'intensité du papier. */
function ecartAuxCartes(teinte: string, theme: "clair" | "sombre"): number {
  const couleur = teinte === "normale" ? variable("paper", theme) : papier(teinte, theme);
  return Math.abs(luminance(variable("surface", theme)) - luminance(couleur));
}

describe("intensité de la couleur du papier", () => {
  for (const theme of ["clair", "sombre"] as const) {
    it(`va de « pâle » à « soutenue » en s'écartant de plus en plus des cartes, en thème ${theme}`, () => {
      const ecarts = ["pale", "douce", "normale", "soutenue"].map((teinte) => ecartAuxCartes(teinte, theme));
      for (let rang = 1; rang < ecarts.length; rang += 1) {
        expect(ecarts[rang]).toBeGreaterThan(ecarts[rang - 1] ?? 0);
      }
    });
  }

  it("garde les mêmes teintes sombres que le thème vienne du système ou du choix de l'enseignant", () => {
    for (const teinte of ["pale", "douce", "soutenue"]) {
      expect(IDENTITE).toContain(`:root[data-teinte="${teinte}"]:not([data-theme="light"]) { --paper: ${papier(teinte, "sombre")}; }`);
    }
  });
});
