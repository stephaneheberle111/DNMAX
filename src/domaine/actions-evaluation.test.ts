// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { actionsSuivi, basculerRestitution, terminerOuRouvrir } from "./actions-evaluation";

const situation = { moduleEleves: true, saisie: { any: 0, full: 0, tot: 0 }, rendusManquants: 0, individuelles: 0, armee: false, promotions: ["DNO-2025-2028"] };

describe("actionsSuivi", () => {
  it("propose de rétablir une évaluation annulée, et de supprimer ses évaluations individuelles s'il y en a", () => {
    expect(actionsSuivi({ annulee: "2026-11-01" }, { ...situation, individuelles: 3 })).toEqual([
      { sorte: "retab" },
      { sorte: "delres", individuelles: 3, armee: false },
    ]);
    expect(actionsSuivi({ annulee: "2026-11-01" }, situation)).toEqual([{ sorte: "retab" }, { sorte: "aucune-individuelle" }]);
  });

  it("sans le module Étudiants, propose de marquer l'évaluation terminée ou de la rouvrir", () => {
    expect(actionsSuivi({ suivi: {} }, { ...situation, moduleEleves: false })[1]).toEqual({ sorte: "fin", libelle: "Marquer l'évaluation terminée" });
    expect(actionsSuivi({ suivi: { evalue: "2026-11-02" } }, { ...situation, moduleEleves: false })[1]).toEqual({ sorte: "fin", libelle: "Rouvrir l'évaluation" });
  });

  it("avec le module Étudiants, ne propose de terminer qu'une saisie commencée, bloquée tant qu'un rendu manque", () => {
    expect(actionsSuivi({ suivi: {} }, situation).map((action) => action.sorte)).toEqual(["sep", "rest", "sep", "annul"]);
    expect(actionsSuivi({ suivi: {} }, { ...situation, saisie: { any: 2, full: 2, tot: 5 } })[1]).toEqual({ sorte: "fin-saisie", full: 2, tot: 5 });
    expect(actionsSuivi({ suivi: {} }, { ...situation, saisie: { any: 2, full: 2, tot: 5 }, rendusManquants: 1 })[1]).toEqual({ sorte: "fin-bloquee", manquants: 1 });
  });

  it("propose une restitution par promotion visée, et l'annulation", () => {
    const actions = actionsSuivi({ suivi: {}, restit: { "DNO-2025-2028": "2026-11-03" } }, { ...situation, promotions: ["DNO-2025-2028", "DNE-2025-2028"] });
    expect(actions.filter((action) => action.sorte === "rest")).toEqual([
      { sorte: "rest", promotion: "DNO-2025-2028", restituee: true, plusieurs: true },
      { sorte: "rest", promotion: "DNE-2025-2028", restituee: false, plusieurs: true },
    ]);
  });
});

describe("terminerOuRouvrir", () => {
  it("termine l'évaluation à la date du jour, en notant comment elle a été évaluée", () => {
    const suivi: Record<string, unknown> = {};
    expect(terminerOuRouvrir(suivi, 0, "dnmax", "2026-11-17")).toBe(true);
    expect(suivi).toEqual({ evalue: "2026-11-17", mode: "dnmax" });
  });

  it("refuse de terminer tant qu'un rendu manque, et rouvre une évaluation terminée", () => {
    expect(terminerOuRouvrir({}, 2, "dnmax", "2026-11-17")).toBe(false);
    const suivi: Record<string, unknown> = { evalue: "2026-11-01", mode: "main" };
    expect(terminerOuRouvrir(suivi, 2, "dnmax", "2026-11-17")).toBe(true);
    expect(suivi).toEqual({});
  });
});

describe("basculerRestitution", () => {
  it("marque une promotion restituée à la date du jour, puis l'annule", () => {
    const evaluation: Record<string, unknown> = {};
    basculerRestitution(evaluation, "DNO-2025-2028", "2026-11-17");
    expect(evaluation.restit).toEqual({ "DNO-2025-2028": "2026-11-17" });
    basculerRestitution(evaluation, "DNO-2025-2028", "2026-11-18");
    expect(evaluation.restit).toEqual({});
  });
});
