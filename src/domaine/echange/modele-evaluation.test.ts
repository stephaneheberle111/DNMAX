// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { creerEvaluation } from "./jeu-essai";
import { extraireModele, listerRubriquesModifiees, ontMemeModele, remplacerModele } from "./modele-evaluation";

describe("extraireModele", () => {
  it("retire élèves, résultats, suivi et identifiants locaux", () => {
    const modele = extraireModele(creerEvaluation({ refV: "v1", eleveIds: ["eleve1"], restit: {}, date: "2026-01-10" }));
    expect(Object.keys(modele).sort()).toEqual(["classes", "consignes", "id", "items", "titre"]);
  });

  it("ne modifie pas l'évaluation d'origine", () => {
    const evaluation = creerEvaluation();
    extraireModele(evaluation);
    expect(evaluation.res).toBeDefined();
  });

  it("garde les champs qu'il ne connaît pas", () => {
    expect(extraireModele(creerEvaluation({ champFutur: 1 })).champFutur).toBe(1);
  });
});

describe("ontMemeModele", () => {
  it("ignore une différence de résultats d'élèves", () => {
    expect(ontMemeModele(creerEvaluation(), creerEvaluation({ res: {} }))).toBe(true);
  });

  it("détecte une différence d'intitulé", () => {
    expect(ontMemeModele(creerEvaluation(), creerEvaluation({ titre: "Autre" }))).toBe(false);
  });

  it("ignore l'ordre des clés", () => {
    expect(ontMemeModele({ id: "a", titre: "T", consignes: "C" }, { consignes: "C", titre: "T", id: "a" })).toBe(true);
  });
});

describe("remplacerModele", () => {
  it("prend le modèle reçu et garde élèves, résultats et suivi d'ici", () => {
    const locale = creerEvaluation({ refV: "v1" });
    const fusion = remplacerModele(locale, creerEvaluation({ titre: "Nouveau titre", res: { intrus: 1 }, refV: "vX" }));
    expect(fusion.titre).toBe("Nouveau titre");
    expect(fusion.res).toEqual(locale.res);
    expect(fusion.suivi).toEqual(locale.suivi);
    expect(fusion.refV).toBe("v1");
  });

  it("retire un champ du modèle que le reçu n'a plus", () => {
    const fusion = remplacerModele(creerEvaluation({ consignes: "à retirer" }), { id: "eval1", titre: "T" });
    expect("consignes" in fusion).toBe(false);
  });

  it("n'invente pas de champ local absent d'ici", () => {
    const fusion = remplacerModele({ id: "eval1", titre: "T" }, creerEvaluation());
    expect("res" in fusion).toBe(false);
  });
});

describe("listerRubriquesModifiees", () => {
  it("rend une liste vide pour deux modèles identiques", () => {
    expect(listerRubriquesModifiees(creerEvaluation(), creerEvaluation({ res: {} }))).toEqual([]);
  });

  it("nomme les rubriques modifiées, triées et sans doublon", () => {
    const recue = creerEvaluation({ titre: "Autre", preset: "acq", niveaux: ["A"], items: [] });
    expect(listerRubriquesModifiees(creerEvaluation(), recue)).toEqual([
      "Compétences et critères",
      "Échelle",
      "Intitulé",
    ]);
  });

  it("range un champ inconnu dans « Autres réglages »", () => {
    expect(listerRubriquesModifiees(creerEvaluation(), creerEvaluation({ champFutur: 1 }))).toEqual(["Autres réglages"]);
  });
});
