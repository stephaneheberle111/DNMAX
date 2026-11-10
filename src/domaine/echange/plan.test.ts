// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import type { Entrees } from "../magasin-memoire";
import { CATALOGUE, creerEntrees, creerEvaluation } from "./jeu-essai";
import { CLE_EVALUATIONS, lireEvaluations } from "./modele";
import { construirePaquet, type Paquet } from "./paquet";
import { appliquerPlan, calculerPlan } from "./plan";
import { CLE_DATES_MODIFICATION, lireDatesModification } from "./suivi-modifications";

const MAINTENANT = new Date("2026-03-09T10:00:00.000Z");
const DATE_ANCIENNE = "2026-01-01T00:00:00.000Z";
const DATE_RECENTE = "2026-02-01T00:00:00.000Z";
const EXPEDITEUR = "Noé Baptiste";

/** Paquet tel qu'un autre enseignant l'enverrait, à partir de ses propres évaluations. */
function paquetRecu(evaluations: unknown[], dates: Record<string, unknown> = {}): Paquet {
  const identifiants = new Set(lireEvaluations(JSON.stringify(evaluations)).map((evaluation) => evaluation.id));
  return construirePaquet(creerEntrees(evaluations, dates), identifiants, MAINTENANT, EXPEDITEUR, CATALOGUE);
}

function planPour(entrees: Entrees, paquet: Paquet) {
  return calculerPlan(entrees, paquet, CATALOGUE);
}

function evaluationsDe(entrees: Entrees) {
  return lireEvaluations(entrees[CLE_EVALUATIONS]);
}

describe("calculerPlan", () => {
  it("propose de créer une évaluation absente d'ici", () => {
    const plan = planPour(creerEntrees([]), paquetRecu([creerEvaluation()]));
    expect(plan).toMatchObject([{ identifiant: "eval1", action: "creer", proposee: true, modifieIciLe: "" }]);
  });

  it("ne propose rien pour une évaluation identique, même si les résultats diffèrent", () => {
    const plan = planPour(
      creerEntrees([creerEvaluation({ res: {} })]),
      paquetRecu([creerEvaluation()]),
    );
    expect(plan).toMatchObject([{ action: "aucune", proposee: false, rubriquesModifiees: [] }]);
  });

  it("propose de modifier quand la version du fichier est la plus récente", () => {
    const ici = creerEntrees([creerEvaluation()], { eval1: DATE_ANCIENNE });
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre" })], { eval1: DATE_RECENTE });
    expect(planPour(ici, paquet)).toMatchObject([
      {
        action: "modifier",
        proposee: true,
        versionLocalePlusRecente: false,
        modifieIciLe: DATE_ANCIENNE,
        modifieDansFichierLe: DATE_RECENTE,
        rubriquesModifiees: ["Intitulé"],
      },
    ]);
  });

  it("ne propose pas d'écraser une version locale plus récente", () => {
    const ici = creerEntrees([creerEvaluation()], { eval1: DATE_RECENTE });
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre" })], { eval1: DATE_ANCIENNE });
    expect(planPour(ici, paquet)).toMatchObject([
      { action: "modifier", proposee: false, versionLocalePlusRecente: true },
    ]);
  });

  it("propose la modification quand une des deux dates est inconnue", () => {
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre" })]);
    expect(planPour(creerEntrees([creerEvaluation()], { eval1: DATE_RECENTE }), paquet)).toMatchObject([
      { action: "modifier", proposee: true, versionLocalePlusRecente: false },
    ]);
  });

  it("indique qui a modifié l'évaluation, ici et dans le fichier", () => {
    const ici = creerEntrees([creerEvaluation()], { eval1: { le: DATE_ANCIENNE, par: "Camille Ferrand" } });
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre" })], {
      eval1: { le: DATE_RECENTE, par: "Noé Baptiste" },
    });
    expect(planPour(ici, paquet)).toMatchObject([
      { modifieIciPar: "Camille Ferrand", modifieDansFichierPar: "Noé Baptiste" },
    ]);
  });

  it("indique si le référentiel est le même qu'ici", () => {
    const plan = planPour(creerEntrees([]), paquetRecu([creerEvaluation()]));
    expect(plan[0]?.referentiel).toEqual({ etat: "identique", versionId: "v1" });
  });

  it("signale un référentiel différent quand aucune empreinte d'ici ne correspond", () => {
    const paquet = paquetRecu([creerEvaluation()]);
    const autreBase = [{ ...CATALOGUE[1], empreinte: "c".repeat(64) }] as typeof CATALOGUE;
    expect(calculerPlan(creerEntrees([]), paquet, autreBase)[0]?.referentiel).toEqual({ etat: "different" });
  });

  it("rend un plan vide pour un paquet vide", () => {
    expect(planPour(creerEntrees([creerEvaluation()]), paquetRecu([]))).toEqual([]);
  });
});

describe("appliquerPlan", () => {
  it("crée l'évaluation en tête, rattachée à la version locale du même référentiel", () => {
    const ici = creerEntrees([creerEvaluation({ id: "dejaLa" })]);
    const plan = planPour(ici, paquetRecu([creerEvaluation()], { eval1: DATE_RECENTE }));
    const apres = appliquerPlan(ici, plan, new Set(["eval1"]), MAINTENANT);
    expect(evaluationsDe(apres).map((evaluation) => evaluation.id)).toEqual(["eval1", "dejaLa"]);
    expect(evaluationsDe(apres)[0]?.refV).toBe("v1");
    expect(evaluationsDe(apres)[0]?.res).toBeUndefined();
    expect(lireDatesModification(apres[CLE_DATES_MODIFICATION]).eval1?.le).toBe(DATE_RECENTE);
  });

  it("modifie le modèle en gardant les résultats et le suivi d'ici", () => {
    const locale = creerEvaluation();
    const ici = creerEntrees([locale], { eval1: DATE_ANCIENNE });
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre", res: {} })], { eval1: DATE_RECENTE });
    const apres = appliquerPlan(ici, planPour(ici, paquet), new Set(["eval1"]), MAINTENANT);
    expect(evaluationsDe(apres)[0]).toMatchObject({ titre: "Autre", res: locale.res, suivi: locale.suivi });
  });

  it("retient l'auteur du fichier, et non celui qui importe", () => {
    const ici = creerEntrees([creerEvaluation()], { eval1: { le: DATE_ANCIENNE, par: "Camille Ferrand" } });
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre" })], {
      eval1: { le: DATE_RECENTE, par: "Noé Baptiste" },
    });
    const apres = appliquerPlan(ici, planPour(ici, paquet), new Set(["eval1"]), MAINTENANT);
    expect(lireDatesModification(apres[CLE_DATES_MODIFICATION]).eval1).toEqual({ le: DATE_RECENTE, par: "Noé Baptiste" });
  });

  it("ne touche pas aux lignes non choisies ni aux autres données", () => {
    const ici = creerEntrees([creerEvaluation()]);
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre" }), creerEvaluation({ id: "eval2" })]);
    const apres = appliquerPlan(ici, planPour(ici, paquet), new Set(["eval2"]), MAINTENANT);
    expect(evaluationsDe(apres).map((evaluation) => [evaluation.id, evaluation.titre])).toEqual([
      ["eval2", "Mobilier modulaire"],
      ["eval1", "Mobilier modulaire"],
    ]);
    expect(apres["dnmade.prefs"]).toBe(ici["dnmade.prefs"]);
  });

  it("rend les entrées telles quelles quand rien n'est choisi", () => {
    const ici = creerEntrees([]);
    const plan = planPour(ici, paquetRecu([creerEvaluation()]));
    expect(appliquerPlan(ici, plan, new Set(), MAINTENANT)).toBe(ici);
  });

  it("ignore le choix d'une ligne identique", () => {
    const ici = creerEntrees([creerEvaluation()]);
    const plan = planPour(ici, paquetRecu([creerEvaluation()]));
    expect(appliquerPlan(ici, plan, new Set(["eval1"]), MAINTENANT)).toBe(ici);
  });

  it("est idempotent : rejouer le même fichier ne propose plus rien", () => {
    const ici = creerEntrees([creerEvaluation()], { eval1: DATE_ANCIENNE });
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre" }), creerEvaluation({ id: "eval2" })]);
    const apres = appliquerPlan(ici, planPour(ici, paquet), new Set(["eval1", "eval2"]), MAINTENANT);
    const secondPlan = planPour(apres, paquet);
    expect(secondPlan.map((ligne) => ligne.action)).toEqual(["aucune", "aucune"]);
  });

  it("date à maintenant une évaluation dont le fichier ne donne pas la date", () => {
    const ici = creerEntrees([]);
    const plan = planPour(ici, paquetRecu([creerEvaluation()]));
    const apres = appliquerPlan(ici, plan, new Set(["eval1"]), MAINTENANT);
    expect(lireDatesModification(apres[CLE_DATES_MODIFICATION]).eval1?.le).toBe(MAINTENANT.toISOString());
  });

  it("conserve à sa place un élément illisible de la liste locale", () => {
    const ici = creerEntrees([{ titre: "sans identifiant" }, creerEvaluation()]);
    const paquet = paquetRecu([creerEvaluation({ titre: "Autre" })]);
    const apres = appliquerPlan(ici, planPour(ici, paquet), new Set(["eval1"]), MAINTENANT);
    expect(JSON.parse(apres[CLE_EVALUATIONS] ?? "[]")).toMatchObject([{ titre: "sans identifiant" }, { titre: "Autre" }]);
  });
});
