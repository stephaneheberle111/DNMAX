// SPDX-License-Identifier: CECILL-2.1
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FEUILLE = readFileSync(new URL("./ecran-parcours.css", import.meta.url), "utf8");

/** Déclarations de la règle dont le sélecteur est exactement `selecteur`, hors requêtes média. */
function declarations(selecteur: string): string {
  const echappe = selecteur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const trouvee = new RegExp(`(?:^|\\})\\s*${echappe}\\s*\\{([^}]*)\\}`, "m").exec(FEUILLE);
  return trouvee?.[1] ?? "";
}

describe("curseur animé de la visite", () => {
  it("un curseur masqué reste invisible même quand une animation fait varier son opacité", () => {
    // L'animation de trajet, sans geste choisi (première étape), fixe l'opacité à 1 et l'emporte
    // sur une opacité nulle déclarée par une classe : seule la visibilité échappe à l'animation.
    expect(declarations(".parcours-curseur-cache")).toMatch(/visibility:\s*hidden/);
  });
});
