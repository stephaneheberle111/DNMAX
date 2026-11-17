// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  aEuLaPromotion,
  anneeDeFormation,
  anneeScolaireDe,
  changerEnseignantDeLEc,
  ecsSansEnseignant,
  etatPromotion,
  libelleDuree,
} from "./etablissement";

describe("état d'une promotion", () => {
  it("calcule l'année de formation à partir de l'année d'entrée", () => {
    expect(anneeDeFormation(2025, 2026)).toBe(2);
  });

  it("dit à venir, en cours ou terminée selon la durée du diplôme", () => {
    expect(etatPromotion(0, 3).etat).toBe("a-venir");
    expect(etatPromotion(3, 3)).toEqual({ etat: "en-cours", annee: 3 });
    expect(etatPromotion(4, 3).etat).toBe("terminee");
  });

  it("écrit l'année scolaire sur deux années civiles", () => {
    expect(anneeScolaireDe(2026)).toBe("2026-2027");
  });
});

describe("répartition de service", () => {
  it("ajoute un enseignant à un EC sans doublon, et le retire", () => {
    const une = changerEnseignantDeLEc({ e1: ["t1"] }, "e1", "t1", true);
    expect(une.e1).toEqual(["t1"]);
    expect(changerEnseignantDeLEc({ e1: ["t1", "t2"] }, "e1", "t1", false).e1).toEqual(["t2"]);
    expect(changerEnseignantDeLEc({}, "e2", "t3", true).e2).toEqual(["t3"]);
  });

  it("ne modifie pas la répartition reçue", () => {
    const avant = { e1: ["t1"] };
    changerEnseignantDeLEc(avant, "e1", "t2", true);
    expect(avant.e1).toEqual(["t1"]);
  });

  it("repère les EC sans enseignant connu, un enseignant supprimé ne comptant plus", () => {
    expect(ecsSansEnseignant(["e1", "e2", "e3"], { e1: ["t1"], e2: ["parti"] }, new Set(["t1"]))).toEqual(["e2", "e3"]);
  });

  it("sait si un enseignant a eu une promotion, quelle que soit l'année", () => {
    const historique = { "2025-2026": { p1: { e1: ["t1"] } }, "2026-2027": { p2: { e1: ["t2"] } } };
    expect(aEuLaPromotion(historique, "p1", "t1")).toBe(true);
    expect(aEuLaPromotion(historique, "p1", "t2")).toBe(false);
    expect(aEuLaPromotion(historique, "p1", "")).toBe(false);
  });
});

describe("libelleDuree", () => {
  it("écrit les durées en mois, ou en années quand elles tombent juste", () => {
    expect([libelleDuree(6), libelleDuree(12), libelleDuree(18), libelleDuree(24)]).toEqual(["6 mois", "1 an", "18 mois", "2 ans"]);
  });
});
