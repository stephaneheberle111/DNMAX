// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { creerEvaluation } from "./jeu-essai";
import { lireDatesModification, mettreAJourDates } from "./suivi-modifications";

const MAINTENANT = new Date("2026-03-09T10:00:00.000Z");
const AUTEUR = "Camille Ferrand";
const ANCIENNE = { le: "2026-01-01T08:00:00.000Z", par: "Noé Baptiste" };
const A_L_INSTANT = { le: MAINTENANT.toISOString(), par: AUTEUR };

function liste(...evaluations: unknown[]): string {
  return JSON.stringify(evaluations);
}

describe("mettreAJourDates", () => {
  it("date une évaluation nouvelle et note son auteur", () => {
    expect(mettreAJourDates(liste(), liste(creerEvaluation()), {}, MAINTENANT, AUTEUR)).toEqual({
      eval1: A_L_INSTANT,
    });
  });

  it("date une évaluation dont le modèle change", () => {
    const apres = liste(creerEvaluation({ titre: "Autre" }));
    expect(mettreAJourDates(liste(creerEvaluation()), apres, { eval1: ANCIENNE }, MAINTENANT, AUTEUR)).toEqual({
      eval1: A_L_INSTANT,
    });
  });

  it("ne change rien quand seuls des résultats d'élèves sont saisis", () => {
    const apres = liste(creerEvaluation({ res: { eleve2: {} } }));
    expect(mettreAJourDates(liste(creerEvaluation()), apres, { eval1: ANCIENNE }, MAINTENANT, AUTEUR)).toBeNull();
  });

  it("rend null quand le texte des évaluations est inchangé", () => {
    const texte = liste(creerEvaluation());
    expect(mettreAJourDates(texte, texte, {}, MAINTENANT, AUTEUR)).toBeNull();
  });

  it("retire la date d'une évaluation supprimée", () => {
    expect(mettreAJourDates(liste(creerEvaluation()), liste(), { eval1: ANCIENNE }, MAINTENANT, AUTEUR)).toEqual({});
  });

  it("laisse sans date une évaluation ancienne jamais modifiée depuis", () => {
    const avant = liste(creerEvaluation(), creerEvaluation({ id: "eval2" }));
    const apres = liste(creerEvaluation(), creerEvaluation({ id: "eval2", titre: "Autre" }));
    expect(mettreAJourDates(avant, apres, {}, MAINTENANT, AUTEUR)).toEqual({ eval2: A_L_INSTANT });
  });

  it("traite une liste absente ou illisible comme vide", () => {
    expect(mettreAJourDates(undefined, "pas du json", {}, MAINTENANT, AUTEUR)).toBeNull();
    expect(mettreAJourDates(null, liste(creerEvaluation()), {}, MAINTENANT, AUTEUR)).toEqual({
      eval1: A_L_INSTANT,
    });
  });
});

describe("lireDatesModification", () => {
  it("lit la date et l'auteur", () => {
    expect(lireDatesModification('{"a":{"le":"2026-01-01","par":"Camille"}}')).toEqual({
      a: { le: "2026-01-01", par: "Camille" },
    });
  });

  it("accepte l'ancien format, où seule la date était notée", () => {
    expect(lireDatesModification('{"a":"2026-01-01"}')).toEqual({ a: { le: "2026-01-01", par: "" } });
  });

  it("écarte ce qui n'a pas la forme attendue et tolère un contenu illisible", () => {
    expect(lireDatesModification('{"a":3,"b":{"par":"sans date"},"c":{"le":"2026-01-01","par":7}}')).toEqual({
      c: { le: "2026-01-01", par: "" },
    });
    expect(lireDatesModification("[]")).toEqual({});
    expect(lireDatesModification(undefined)).toEqual({});
  });
});
