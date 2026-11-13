// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import type { Entrees } from "../magasin-memoire";
import { CATALOGUE, creerEntrees, creerEvaluation } from "./jeu-essai";
import { CLE_EVALUATIONS, CLE_PROMOTIONS, lireEvaluations } from "./modele";
import { construirePaquet, estFichierProtege, lirePaquet, type Paquet } from "./paquet";
import { appliquerPlan, calculerPlan } from "./plan";
import { appliquerResultats, calculerPlanResultats } from "./plan-resultats";

const MAINTENANT = new Date("2026-03-09T10:00:00.000Z");
const ELEVES = [
  { id: "s1", nom: "Étudiant Un" },
  { id: "s2", nom: "Étudiant Deux" },
];
const PROMOTION = { id: "p1", nom: "DNO-2025-2028", diplomeId: "d0", debut: 2025, liste: ELEVES };
const RESULTATS = { s1: { n: { "C1.1": 3 } }, s2: { n: { "C1.1": 2 } } };

function entreesAvec(evaluations: unknown[], promotions: unknown[]): Entrees {
  return { ...creerEntrees(evaluations), [CLE_PROMOTIONS]: JSON.stringify(promotions) };
}

/** Fichier protégé tel que l'envoie un enseignant qui a évalué les deux étudiants. */
function paquetAvecResultats(surcharge: Record<string, unknown> = {}): Paquet {
  const evaluation = creerEvaluation({ res: RESULTATS, eleves: "", ...surcharge });
  return construirePaquet(entreesAvec([evaluation], [PROMOTION]), new Set(["eval1"]), MAINTENANT, "Noé Baptiste", CATALOGUE, new Set(), true);
}

function generateur(): () => string {
  let numero = 0;
  return () => {
    numero += 1;
    return `neuf${String(numero)}`;
  };
}

function importer(ici: Entrees, paquet: Paquet, aRemplacer: string[] = []): Entrees {
  const avecModeles = appliquerPlan(ici, calculerPlan(ici, paquet, CATALOGUE), new Set(["eval1"]), MAINTENANT);
  return appliquerResultats(avecModeles, paquet, CATALOGUE, new Set(["eval1"]), new Set(aRemplacer), generateur());
}

describe("fichier d'échange avec étudiants", () => {
  it("n'emporte les étudiants que si l'envoi protégé est demandé", () => {
    const entrees = entreesAvec([creerEvaluation({ res: RESULTATS })], [PROMOTION]);
    const sansEleves = construirePaquet(entrees, new Set(["eval1"]), MAINTENANT, "Noé Baptiste", CATALOGUE);
    expect(sansEleves.promotions).toEqual([]);
    expect(sansEleves.evaluations[0]?.donneesEleves).toBeNull();
    expect(JSON.stringify(sansEleves)).not.toContain("Étudiant Un");
  });

  it("emporte la promotion, désignée par son diplôme, et les résultats", () => {
    const paquet = paquetAvecResultats();
    expect(paquet.promotions).toEqual([
      { id: "p1", nom: "DNO-2025-2028", diplome: "DN MADE", mention: "Objet", debut: 2025, eleves: ELEVES },
    ]);
    expect(paquet.evaluations[0]?.donneesEleves).toMatchObject({ promotionId: "p1", champs: { res: RESULTATS } });
  });

  it("un fichier en clair ne fait jamais entrer de données d'étudiants, même s'il en contient", () => {
    const texte = JSON.stringify(paquetAvecResultats());
    const lu = lirePaquet(texte);
    expect(lu).toMatchObject({ promotions: [], evaluations: [{ donneesEleves: null }] });
    expect(lirePaquet(texte, true)).toMatchObject({ promotions: [{ id: "p1" }], evaluations: [{ donneesEleves: { promotionId: "p1" } }] });
  });

  it("reconnaît un fichier protégé à son format", () => {
    expect(estFichierProtege('{"format":"dnmax-coffre","version":1}')).toBe(true);
    expect(estFichierProtege('{"format":"dnmax-echange","version":1}')).toBe(false);
    expect(estFichierProtege("pas du json")).toBe(false);
  });
});

describe("calculerPlanResultats", () => {
  it("annonce la création de la promotion et les résultats nouveaux", () => {
    const plan = calculerPlanResultats(entreesAvec([], []), paquetAvecResultats(), CATALOGUE);
    expect(plan.get("eval1")).toEqual({
      identifiant: "eval1",
      possible: true,
      bilan: { nouveaux: 2, differents: 0, identiques: 0 },
      elevesAjoutes: 2,
      promotionCreee: true,
    });
  });

  it("distingue résultats identiques, différents et nouveaux", () => {
    const ici = entreesAvec([creerEvaluation({ res: { s1: { n: { "C1.1": 4 } } } })], [PROMOTION]);
    expect(calculerPlanResultats(ici, paquetAvecResultats(), CATALOGUE).get("eval1")?.bilan).toEqual({
      nouveaux: 1,
      differents: 1,
      identiques: 0,
    });
  });

  it("déclare l'import impossible quand le diplôme de la promotion n'existe pas ici", () => {
    const plan = calculerPlanResultats(entreesAvec([], []), paquetAvecResultats(), []);
    expect(plan.get("eval1")?.possible).toBe(false);
  });

  it("n'a pas de ligne pour une évaluation reçue sans données d'étudiants", () => {
    const sansEleves = construirePaquet(entreesAvec([creerEvaluation()], [PROMOTION]), new Set(["eval1"]), MAINTENANT, "Noé", CATALOGUE);
    expect(calculerPlanResultats(entreesAvec([], []), sansEleves, CATALOGUE).size).toBe(0);
  });
});

describe("appliquerResultats", () => {
  it("crée la promotion et pose les résultats sur l'évaluation créée", () => {
    const apres = importer(entreesAvec([], []), paquetAvecResultats());
    expect(lireEvaluations(apres[CLE_EVALUATIONS])[0]).toMatchObject({ promoId: "p1", res: RESULTATS });
    expect(JSON.parse(apres[CLE_PROMOTIONS] ?? "[]")).toMatchObject([{ id: "p1", diplomeId: "d0", liste: ELEVES }]);
  });

  it("retrouve par leur nom les étudiants d'une promotion saisie séparément", () => {
    const promotionLocale = { id: "pLocal", nom: "DNO-2025-2028", diplomeId: "d0", liste: [{ id: "a", nom: "étudiant un" }] };
    const ici = entreesAvec([creerEvaluation({ promoId: "pLocal", res: {} })], [promotionLocale]);
    const apres = importer(ici, paquetAvecResultats());
    const evaluation = lireEvaluations(apres[CLE_EVALUATIONS])[0];
    expect(evaluation?.res).toEqual({ a: RESULTATS.s1, neuf1: RESULTATS.s2 });
    expect(evaluation?.promoId).toBe("pLocal");
    expect(JSON.parse(apres[CLE_PROMOTIONS] ?? "[]")).toMatchObject([
      { id: "pLocal", liste: [{ id: "a", nom: "étudiant un" }, { id: "neuf1", nom: "Étudiant Deux" }] },
    ]);
  });

  it("garde les résultats d'ici qui diffèrent, sauf remplacement demandé", () => {
    const miens = { s1: { n: { "C1.1": 4 } } };
    const ici = entreesAvec([creerEvaluation({ res: miens })], [PROMOTION]);
    expect(lireEvaluations(importer(ici, paquetAvecResultats())[CLE_EVALUATIONS])[0]?.res).toEqual({
      s1: miens.s1,
      s2: RESULTATS.s2,
    });
    expect(lireEvaluations(importer(ici, paquetAvecResultats(), ["eval1"])[CLE_EVALUATIONS])[0]?.res).toEqual(RESULTATS);
  });

  it("rapproche par les noms une liste d'étudiants saisie à la main", () => {
    const paquet = paquetAvecResultats({ promoId: "", classes: [], eleves: "Étudiant Un\nÉtudiant Deux", res: { libre0: { n: {} }, libre1: { n: { a: 1 } } } });
    const ici = entreesAvec([creerEvaluation({ promoId: "", classes: [], eleves: "Étudiant Deux", res: {} })], []);
    const apres = importer(ici, paquet);
    expect(lireEvaluations(apres[CLE_EVALUATIONS])[0]).toMatchObject({
      eleves: "Étudiant Deux\nÉtudiant Un",
      res: { libre0: { n: { a: 1 } }, libre1: { n: {} } },
    });
  });

  it("ne fait rien pour une évaluation du fichier qui n'a pas été créée ici", () => {
    const ici = entreesAvec([], []);
    expect(appliquerResultats(ici, paquetAvecResultats(), CATALOGUE, new Set(["eval1"]), new Set(), generateur())).toBe(ici);
  });

  it("ne fait rien quand l'import est impossible ou non choisi", () => {
    const ici = entreesAvec([creerEvaluation({ res: {} })], []);
    expect(appliquerResultats(ici, paquetAvecResultats(), [], new Set(["eval1"]), new Set(), generateur())).toBe(ici);
    expect(appliquerResultats(ici, paquetAvecResultats(), CATALOGUE, new Set(), new Set(), generateur())).toBe(ici);
  });

  it("rejouer le même fichier ne trouve plus que des résultats identiques", () => {
    const paquet = paquetAvecResultats();
    const apres = importer(entreesAvec([], []), paquet);
    expect(calculerPlanResultats(apres, paquet, CATALOGUE).get("eval1")).toMatchObject({
      bilan: { nouveaux: 0, differents: 0, identiques: 2 },
      elevesAjoutes: 0,
      promotionCreee: false,
    });
  });
});
