// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { etatVide, NOMS_HISTORIQUES, publierEtat } from "./etat";

describe("publierEtat", () => {
  it("fait lire l'état sous les noms du fichier historique", () => {
    const source = etatVide();
    source.donnees = { activeDiplome: "d1" };
    const fenetre: Record<string, unknown> = {};
    publierEtat(fenetre, source);
    expect(fenetre.DATA).toBe(source.donnees);
  });

  it("fait d'une réaffectation historique une mise à jour de l'état", () => {
    const source = etatVide();
    const fenetre: Record<string, unknown> = {};
    publierEtat(fenetre, source);
    const evaluation = { id: "f1" };
    fenetre.F = evaluation;
    expect(source.evaluation).toBe(evaluation);
  });

  it("publie chaque partie de l'état, et elles seules", () => {
    const fenetre: Record<string, unknown> = {};
    publierEtat(fenetre, etatVide());
    expect(Object.getOwnPropertyNames(fenetre).sort()).toEqual(Object.keys(NOMS_HISTORIQUES).sort());
  });
});
