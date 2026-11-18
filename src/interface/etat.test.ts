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

  it("publie la suppression armée, nulle au départ", () => {
    const source = etatVide();
    const fenetre: Record<string, unknown> = {};
    publierEtat(fenetre, source);
    expect(fenetre.edArm).toBeNull();
    fenetre.edArm = "ens1";
    expect(source.armement).toBe("ens1");
  });

  it("publie la teinte des blocs, vide jusqu'à ce que le fichier historique la relève", () => {
    const source = etatVide();
    const fenetre: Record<string, unknown> = {};
    publierEtat(fenetre, source);
    expect(fenetre.BLOC_TINT).toBe("");
    fenetre.BLOC_TINT = "#D1F1DA";
    expect(source.teinteBlocs).toBe("#D1F1DA");
  });
});
