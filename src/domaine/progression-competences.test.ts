// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { passeLeFiltre, progressionDesCompetences, type EvaluationLue } from "./progression-competences";

const evaluee = (evaluation: EvaluationLue & { evaluee?: boolean }): boolean => evaluation.evaluee === true;

describe("progressionDesCompetences", () => {
  const base = { semestre: "S3", idsEtudiants: ["a", "b"], estEvaluee: evaluee, moduleEleves: true };

  it("dit « à évaluer » d'une compétence qu'aucune évaluation ne retient", () => {
    expect(progressionDesCompetences({ ...base, codes: ["C1.1"], evaluations: [] })["C1.1"]?.etat).toBe("todo");
  });

  it("dit « vue ailleurs » d'une compétence évaluée à un autre semestre seulement", () => {
    const evaluations = [{ semestre: "S1", items: [{ code: "C1.1" }] }];
    expect(progressionDesCompetences({ ...base, codes: ["C1.1"], evaluations })["C1.1"]?.etat).toBe("autre");
  });

  it("dit « prévue » tant qu'aucune évaluation du semestre n'est évaluée", () => {
    const evaluations = [{ semestre: "S3", items: [{ code: "C1.1" }], evaluee: false }];
    expect(progressionDesCompetences({ ...base, codes: ["C1.1"], evaluations })["C1.1"]?.etat).toBe("prevue");
  });

  it("compte les étudiants notés, y compris par un regroupement, et dit « en cours » s'il en manque", () => {
    const evaluations = [
      { semestre: "S3", items: [{ code: "C1.1", op: "g" }], evaluee: true, res: { a: { n: { "op:g": 2 } }, b: { n: { "op:g": "" } } } },
    ];
    const progression = progressionDesCompetences({ ...base, codes: ["C1.1"], evaluations })["C1.1"];
    expect([progression?.faits, progression?.total, progression?.etat]).toEqual([1, 2, "part"]);
  });

  it("dit « évaluée » sans le module Étudiants dès qu'une évaluation du semestre est évaluée", () => {
    const evaluations = [{ semestre: "S3", items: [{ code: "C1.1" }], evaluee: true }];
    expect(progressionDesCompetences({ ...base, moduleEleves: false, codes: ["C1.1"], evaluations })["C1.1"]?.etat).toBe("ok");
  });
});

describe("passeLeFiltre", () => {
  const prevue = { auSemestre: [{}], partout: [{}], faits: 0, total: 0, etat: "prevue" as const };
  const aFaire = { auSemestre: [], partout: [], faits: 0, total: 0, etat: "todo" as const };

  it("garde les compétences à évaluer sous « À évaluer » et les autres sous « Déjà évaluées »", () => {
    expect([passeLeFiltre(aFaire, "todo"), passeLeFiltre(prevue, "todo")]).toEqual([true, false]);
    expect([passeLeFiltre(aFaire, "fait"), passeLeFiltre(prevue, "fait")]).toEqual([false, true]);
  });

  it("laisse passer une compétence sans progression connue", () => {
    expect(passeLeFiltre(undefined, "todo")).toBe(true);
  });
});
