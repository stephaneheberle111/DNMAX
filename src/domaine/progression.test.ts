// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  dateDeLEvaluation,
  derniersNiveaux,
  etatEtudiantDansEvaluation,
  niveauNormalise,
  positionDansLaClasse,
  progressionPromotion,
  trajectoires,
} from "./progression";

const evaluee = (evaluation: { evaluee?: boolean }): boolean => evaluation.evaluee === true;

function evaluation(changements: Record<string, unknown>): Record<string, unknown> {
  return { semestre: "S3", items: [{ code: "C1.1", op: "", libelle: "", livrables: [] }], ops: [], ...changements };
}

describe("niveauNormalise", () => {
  it("ramène un niveau d'une échelle à trois niveaux sur une échelle à quatre", () => {
    expect(niveauNormalise(1, 3, 4)).toBe(2);
    expect(niveauNormalise(2, 3, 4)).toBe(3);
  });

  it("prend l'échelle de référence quand l'évaluation ne dit rien", () => {
    expect(niveauNormalise(2, 0, 4)).toBe(2);
  });
});

describe("progressionPromotion", () => {
  const base = { codes: ["C1.1"], semestre: "S3", idsEtudiants: ["a", "b"], nombreNiveaux: 4, estEvaluee: evaluee, moduleEleves: true };

  it("dit « à évaluer », « vue ailleurs » puis « prévue » selon les évaluations", () => {
    expect(progressionPromotion({ ...base, evaluations: [] })["C1.1"]?.etat).toBe("todo");
    expect(progressionPromotion({ ...base, evaluations: [evaluation({ semestre: "S1" })] })["C1.1"]?.etat).toBe("autre");
    expect(progressionPromotion({ ...base, evaluations: [evaluation({ evaluee: false })] })["C1.1"]?.etat).toBe("prevue");
  });

  it("garde le niveau le plus récent de chaque étudiant et répartit la promotion par niveau", () => {
    const evaluations = [
      evaluation({ date: "2026-10-01", evaluee: true, res: { a: { n: { "one:C1.1": 1 } } } }),
      evaluation({ date: "2026-11-01", evaluee: true, res: { a: { n: { "one:C1.1": 3 } }, b: { n: { "one:C1.1": 2 } } } }),
    ];
    const progression = progressionPromotion({ ...base, evaluations })["C1.1"];
    expect(progression?.repartition).toEqual([0, 0, 1, 1]);
    expect([progression?.faits, progression?.etat]).toEqual([2, "ok"]);
  });

  it("reste « en cours » avec le module Étudiants tant qu'il manque un étudiant, ou s'il n'y en a aucun", () => {
    const evaluations = [evaluation({ evaluee: true, res: { a: { n: { "one:C1.1": 2 } } } })];
    expect(progressionPromotion({ ...base, evaluations })["C1.1"]?.etat).toBe("part");
    expect(progressionPromotion({ ...base, idsEtudiants: [], evaluations })["C1.1"]?.etat).toBe("part");
    expect(progressionPromotion({ ...base, moduleEleves: false, evaluations })["C1.1"]?.etat).toBe("ok");
  });
});

describe("etatEtudiantDansEvaluation", () => {
  const cles = ["one:C1.1", "op:g"];

  it("distingue évalué, partiel, non rendu et dispensé", () => {
    expect(etatEtudiantDansEvaluation({ n: { "one:C1.1": 2, "op:g": 1 } }, cles, 1).etat).toBe("ok");
    expect(etatEtudiantDansEvaluation({ n: { "one:C1.1": 2 } }, cles, 1)).toEqual({ etat: "part", lignesSaisies: 1 });
    expect(etatEtudiantDansEvaluation({ nr: "2026-11-01" }, cles, 1).etat).toBe("nr");
    expect(etatEtudiantDansEvaluation({ disp: "2026-11-01", nr: "x" }, cles, 1).etat).toBe("disp");
  });

  it("signale un étudiant oublié quand d'autres sont déjà saisis, sinon une évaluation pas encore faite", () => {
    expect(etatEtudiantDansEvaluation({}, cles, 3).etat).toBe("miss");
    expect(etatEtudiantDansEvaluation(undefined, cles, 0).etat).toBe("wait");
  });
});

describe("dateDeLEvaluation", () => {
  it("prend la distribution prévue, sinon faite, sinon la date de saisie", () => {
    expect(dateDeLEvaluation({ distribPrev: "2026-11-02", date: "2026-10-01" })).toBe("2026-11-02");
    expect(dateDeLEvaluation({ suivi: { distrib: "2026-11-03" }, date: "2026-10-01" })).toBe("2026-11-03");
    expect(dateDeLEvaluation({ date: "2026-10-01" })).toBe("2026-10-01");
  });
});

describe("trajectoires et derniersNiveaux", () => {
  const regroupement = evaluation({
    date: "2026-11-01",
    items: [
      { code: "C1.1", op: "g", libelle: "", livrables: [] },
      { code: "C2.1", op: "g", libelle: "", livrables: [] },
    ],
    ops: [{ id: "g", libelle: "", livrables: [] }],
    res: { a: { n: { "op:g": 3 } } },
  });
  const ancienne = evaluation({ date: "2026-10-01", res: { a: { n: { "one:C1.1": 1 } } } });
  const absent = evaluation({ date: "2026-12-01", res: { a: { nr: "x", n: { "one:C1.1": 0 } } } });

  it("range les niveaux de chaque compétence par date, un regroupement comptant pour chacune de ses compétences", () => {
    const parCompetence = trajectoires([regroupement, ancienne], "a", 4);
    expect(parCompetence["C1.1"]?.map((point) => point.niveau)).toEqual([1, 3]);
    expect(parCompetence["C2.1"]?.map((point) => point.niveau)).toEqual([3]);
  });

  it("donne le dernier niveau connu, en ignorant une évaluation où l'étudiant est non rendu", () => {
    expect(derniersNiveaux([absent, regroupement, ancienne], "a", 4)).toEqual({ "C1.1": 3, "C2.1": 3 });
  });
});

describe("positionDansLaClasse", () => {
  it("situe l'étudiant par rapport à la moyenne arrondie de la classe", () => {
    expect(positionDansLaClasse(3, [1, 2, 2, undefined])).toEqual({ moyenne: 2, ecart: 1, nombre: 3 });
  });

  it("ne compare pas quand moins de deux niveaux sont connus", () => {
    expect(positionDansLaClasse(2, [2, undefined])).toBeNull();
  });
});
