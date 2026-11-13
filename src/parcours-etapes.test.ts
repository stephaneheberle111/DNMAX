// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { chapitreDe, PARCOURS_DEFINIS } from "./parcours-etapes";

const ETAPES = [
  { titre: "Bienvenue" },
  { titre: "Mon établissement" },
  { titre: "1. Promotions" },
  { titre: "2. Exporter" },
  { titre: "Fin" },
];

describe("chapitreDe", () => {
  it("rattache une étape de navigation à la grande étape qu'elle prépare", () => {
    expect(chapitreDe(ETAPES, 1)).toBe(0);
  });

  it("lit le numéro d'une étape numérotée", () => {
    expect(chapitreDe(ETAPES, 3)).toBe(1);
  });

  it("ne rattache rien après la dernière étape numérotée", () => {
    expect(chapitreDe(ETAPES, 4)).toBeNull();
  });

  it("chaque grande étape de la prise en main a au moins une étape numérotée", () => {
    const parcours = PARCOURS_DEFINIS["prise-en-main"];
    const vus = new Set(parcours.etapes.map((_, index) => chapitreDe(parcours.etapes, index)));
    parcours.chapitres?.forEach((_, rang) => {
      expect(vus.has(rang)).toBe(true);
    });
  });
});

describe("prise en main, grande étape Référentiel", () => {
  it("ne mène plus au volet « Définir », abandonné", () => {
    const cibles = PARCOURS_DEFINIS["prise-en-main"].etapes.flatMap((etape) => etape.cibles ?? []);
    expect(cibles.some((cible) => cible.includes("definir"))).toBe(false);
  });

  it("présente les étapes de « Constituer » avant d'ouvrir la validation", () => {
    const etapes = PARCOURS_DEFINIS["prise-en-main"].etapes;
    const rang = (selecteur: string): number => etapes.findIndex((etape) => etape.cibles?.includes(selecteur) === true);
    const presentation = rang("#refPane .steps");
    expect(presentation).toBeGreaterThan(rang('#refNav [data-pane="constituer"]'));
    expect(presentation).toBeLessThan(rang('#refPane .steps [data-cp="valider"]'));
  });
});
