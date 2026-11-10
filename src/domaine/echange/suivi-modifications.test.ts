// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { creerEvaluation } from "./jeu-essai";
import { lireDatesModification, mettreAJourDates } from "./suivi-modifications";

const MAINTENANT = new Date("2026-03-09T10:00:00.000Z");
const ANCIENNE_DATE = "2026-01-01T08:00:00.000Z";

function liste(...evaluations: unknown[]): string {
  return JSON.stringify(evaluations);
}

describe("mettreAJourDates", () => {
  it("date une évaluation nouvelle", () => {
    expect(mettreAJourDates(liste(), liste(creerEvaluation()), {}, MAINTENANT)).toEqual({
      eval1: MAINTENANT.toISOString(),
    });
  });

  it("date une évaluation dont le modèle change", () => {
    const apres = liste(creerEvaluation({ titre: "Autre" }));
    expect(mettreAJourDates(liste(creerEvaluation()), apres, { eval1: ANCIENNE_DATE }, MAINTENANT)).toEqual({
      eval1: MAINTENANT.toISOString(),
    });
  });

  it("ne change rien quand seuls des résultats d'élèves sont saisis", () => {
    const apres = liste(creerEvaluation({ res: { eleve2: {} } }));
    expect(mettreAJourDates(liste(creerEvaluation()), apres, { eval1: ANCIENNE_DATE }, MAINTENANT)).toBeNull();
  });

  it("rend null quand le texte des évaluations est inchangé", () => {
    const texte = liste(creerEvaluation());
    expect(mettreAJourDates(texte, texte, {}, MAINTENANT)).toBeNull();
  });

  it("retire la date d'une évaluation supprimée", () => {
    expect(mettreAJourDates(liste(creerEvaluation()), liste(), { eval1: ANCIENNE_DATE }, MAINTENANT)).toEqual({});
  });

  it("laisse sans date une évaluation ancienne jamais modifiée depuis", () => {
    const avant = liste(creerEvaluation(), creerEvaluation({ id: "eval2" }));
    const apres = liste(creerEvaluation(), creerEvaluation({ id: "eval2", titre: "Autre" }));
    expect(mettreAJourDates(avant, apres, {}, MAINTENANT)).toEqual({ eval2: MAINTENANT.toISOString() });
  });

  it("traite une liste absente ou illisible comme vide", () => {
    expect(mettreAJourDates(undefined, "pas du json", {}, MAINTENANT)).toBeNull();
    expect(mettreAJourDates(null, liste(creerEvaluation()), {}, MAINTENANT)).toEqual({
      eval1: MAINTENANT.toISOString(),
    });
  });
});

describe("lireDatesModification", () => {
  it("écarte ce qui n'est pas un texte et tolère un contenu illisible", () => {
    expect(lireDatesModification('{"a":"2026-01-01","b":3}')).toEqual({ a: "2026-01-01" });
    expect(lireDatesModification("[]")).toEqual({});
    expect(lireDatesModification(undefined)).toEqual({});
  });
});
