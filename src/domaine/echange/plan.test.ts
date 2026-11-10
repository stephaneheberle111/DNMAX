// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import type { Entrees } from "../magasin-memoire";
import { creerEntrees, creerEvaluation } from "./jeu-essai";
import { CLE_EVALUATIONS, lireEvaluations } from "./modele";
import { construirePaquet, type Paquet } from "./paquet";
import { appliquerPlan, calculerPlan } from "./plan";
import { CLE_DATES_MODIFICATION, lireDatesModification } from "./suivi-modifications";

const MAINTENANT = new Date("2026-03-09T10:00:00.000Z");
const DATE_ANCIENNE = "2026-01-01T00:00:00.000Z";
const DATE_RECENTE = "2026-02-01T00:00:00.000Z";

/** Paquet tel qu'un collègue l'enverrait, à partir de ses propres évaluations. */
async function paquetDuCollegue(evaluations: unknown[], dates: Record<string, string> = {}): Promise<Paquet> {
  const identifiants = new Set(lireEvaluations(JSON.stringify(evaluations)).map((evaluation) => evaluation.id));
  return construirePaquet(creerEntrees(evaluations, dates), identifiants, MAINTENANT);
}

function evaluationsDe(entrees: Entrees) {
  return lireEvaluations(entrees[CLE_EVALUATIONS]);
}

describe("calculerPlan", () => {
  it("propose de créer une évaluation absente d'ici", async () => {
    const plan = await calculerPlan(creerEntrees([]), await paquetDuCollegue([creerEvaluation()]));
    expect(plan).toMatchObject([{ identifiant: "eval1", action: "creer", proposee: true, modifieIciLe: "" }]);
  });

  it("ne propose rien pour une évaluation identique, même si les résultats diffèrent", async () => {
    const plan = await calculerPlan(
      creerEntrees([creerEvaluation({ res: {} })]),
      await paquetDuCollegue([creerEvaluation()]),
    );
    expect(plan).toMatchObject([{ action: "aucune", proposee: false, rubriquesModifiees: [] }]);
  });

  it("propose de modifier quand la version du fichier est la plus récente", async () => {
    const ici = creerEntrees([creerEvaluation()], { eval1: DATE_ANCIENNE });
    const paquet = await paquetDuCollegue([creerEvaluation({ titre: "Autre" })], { eval1: DATE_RECENTE });
    expect(await calculerPlan(ici, paquet)).toMatchObject([
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

  it("ne propose pas d'écraser une version locale plus récente", async () => {
    const ici = creerEntrees([creerEvaluation()], { eval1: DATE_RECENTE });
    const paquet = await paquetDuCollegue([creerEvaluation({ titre: "Autre" })], { eval1: DATE_ANCIENNE });
    expect(await calculerPlan(ici, paquet)).toMatchObject([
      { action: "modifier", proposee: false, versionLocalePlusRecente: true },
    ]);
  });

  it("propose la modification quand une des deux dates est inconnue", async () => {
    const paquet = await paquetDuCollegue([creerEvaluation({ titre: "Autre" })]);
    expect(await calculerPlan(creerEntrees([creerEvaluation()], { eval1: DATE_RECENTE }), paquet)).toMatchObject([
      { action: "modifier", proposee: true, versionLocalePlusRecente: false },
    ]);
  });

  it("indique si le référentiel est le même qu'ici", async () => {
    const plan = await calculerPlan(creerEntrees([]), await paquetDuCollegue([creerEvaluation()]));
    expect(plan[0]?.referentiel).toEqual({ etat: "identique", versionId: "v1" });
  });

  it("rend un plan vide pour un paquet vide", async () => {
    expect(await calculerPlan(creerEntrees([creerEvaluation()]), await paquetDuCollegue([]))).toEqual([]);
  });
});

describe("appliquerPlan", () => {
  it("crée l'évaluation en tête, rattachée à la version locale du même référentiel", async () => {
    const ici = creerEntrees([creerEvaluation({ id: "dejaLa" })]);
    const plan = await calculerPlan(ici, await paquetDuCollegue([creerEvaluation()], { eval1: DATE_RECENTE }));
    const apres = appliquerPlan(ici, plan, new Set(["eval1"]), MAINTENANT);
    expect(evaluationsDe(apres).map((evaluation) => evaluation.id)).toEqual(["eval1", "dejaLa"]);
    expect(evaluationsDe(apres)[0]?.refV).toBe("v1");
    expect(evaluationsDe(apres)[0]?.res).toBeUndefined();
    expect(lireDatesModification(apres[CLE_DATES_MODIFICATION]).eval1).toBe(DATE_RECENTE);
  });

  it("modifie le modèle en gardant les résultats et le suivi d'ici", async () => {
    const locale = creerEvaluation();
    const ici = creerEntrees([locale], { eval1: DATE_ANCIENNE });
    const paquet = await paquetDuCollegue([creerEvaluation({ titre: "Autre", res: {} })], { eval1: DATE_RECENTE });
    const apres = appliquerPlan(ici, await calculerPlan(ici, paquet), new Set(["eval1"]), MAINTENANT);
    expect(evaluationsDe(apres)[0]).toMatchObject({ titre: "Autre", res: locale.res, suivi: locale.suivi });
  });

  it("ne touche pas aux lignes non choisies ni aux autres données", async () => {
    const ici = creerEntrees([creerEvaluation()]);
    const paquet = await paquetDuCollegue([creerEvaluation({ titre: "Autre" }), creerEvaluation({ id: "eval2" })]);
    const apres = appliquerPlan(ici, await calculerPlan(ici, paquet), new Set(["eval2"]), MAINTENANT);
    expect(evaluationsDe(apres).map((evaluation) => [evaluation.id, evaluation.titre])).toEqual([
      ["eval2", "Mobilier modulaire"],
      ["eval1", "Mobilier modulaire"],
    ]);
    expect(apres["dnmade.prefs"]).toBe(ici["dnmade.prefs"]);
  });

  it("rend les entrées telles quelles quand rien n'est choisi", async () => {
    const ici = creerEntrees([]);
    const plan = await calculerPlan(ici, await paquetDuCollegue([creerEvaluation()]));
    expect(appliquerPlan(ici, plan, new Set(), MAINTENANT)).toBe(ici);
  });

  it("ignore le choix d'une ligne identique", async () => {
    const ici = creerEntrees([creerEvaluation()]);
    const plan = await calculerPlan(ici, await paquetDuCollegue([creerEvaluation()]));
    expect(appliquerPlan(ici, plan, new Set(["eval1"]), MAINTENANT)).toBe(ici);
  });

  it("est idempotent : rejouer le même fichier ne propose plus rien", async () => {
    const ici = creerEntrees([creerEvaluation()], { eval1: DATE_ANCIENNE });
    const paquet = await paquetDuCollegue([creerEvaluation({ titre: "Autre" }), creerEvaluation({ id: "eval2" })]);
    const apres = appliquerPlan(ici, await calculerPlan(ici, paquet), new Set(["eval1", "eval2"]), MAINTENANT);
    const secondPlan = await calculerPlan(apres, paquet);
    expect(secondPlan.map((ligne) => ligne.action)).toEqual(["aucune", "aucune"]);
  });

  it("date à maintenant une évaluation dont le fichier ne donne pas la date", async () => {
    const ici = creerEntrees([]);
    const plan = await calculerPlan(ici, await paquetDuCollegue([creerEvaluation()]));
    const apres = appliquerPlan(ici, plan, new Set(["eval1"]), MAINTENANT);
    expect(lireDatesModification(apres[CLE_DATES_MODIFICATION]).eval1).toBe(MAINTENANT.toISOString());
  });

  it("conserve à sa place un élément illisible de la liste locale", async () => {
    const ici = creerEntrees([{ titre: "sans identifiant" }, creerEvaluation()]);
    const paquet = await paquetDuCollegue([creerEvaluation({ titre: "Autre" })]);
    const apres = appliquerPlan(ici, await calculerPlan(ici, paquet), new Set(["eval1"]), MAINTENANT);
    expect(JSON.parse(apres[CLE_EVALUATIONS] ?? "[]")).toMatchObject([{ titre: "sans identifiant" }, { titre: "Autre" }]);
  });
});
