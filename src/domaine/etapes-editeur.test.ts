// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { derniereEtape, etapeAffichee, resumeEtapes } from "./etapes-editeur";

describe("derniereEtape", () => {
  it("ouvre l'étape 4 avec le module Étudiants, pour une évaluation enregistrée", () => {
    expect(derniereEtape({ moduleEleves: true, brouillon: false })).toBe(4);
  });

  it("s'arrête à l'étape 3 pour un brouillon ou sans le module Étudiants", () => {
    expect(derniereEtape({ moduleEleves: true, brouillon: true })).toBe(3);
    expect(derniereEtape({ moduleEleves: false, brouillon: false })).toBe(3);
  });
});

describe("etapeAffichee", () => {
  it("ramène l'étape demandée entre 1 et la dernière accessible", () => {
    expect(etapeAffichee(4, 3)).toBe(3);
    expect(etapeAffichee(0, 4)).toBe(1);
    expect(etapeAffichee(2, 4)).toBe(2);
  });
});

describe("resumeEtapes", () => {
  it("compte livrables, compétences, lignes, regroupements et lignes formulées", () => {
    const evaluation = {
      livrables: ["Carnet", "Maquette"],
      items: [
        { code: "C1.1", op: "g", libelle: "", livrables: [] },
        { code: "C2.1", op: "g", libelle: "", livrables: [] },
        { code: "C3.1", op: "", libelle: "Présenter", livrables: [] },
        { code: "C4.1", op: "", libelle: "", livrables: [] },
      ],
      ops: [
        { id: "g", libelle: "", livrables: [] },
        { id: "vide", libelle: "", livrables: [] },
      ],
    };
    expect(resumeEtapes(evaluation)).toEqual({ livrables: 2, retenues: 4, lignes: 3, regroupements: 1, formulees: 2 });
  });

  it("rend des zéros pour une évaluation vide", () => {
    expect(resumeEtapes({})).toEqual({ livrables: 0, retenues: 0, lignes: 0, regroupements: 0, formulees: 0 });
  });
});
