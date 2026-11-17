// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { avancementSaisie, estEvaluee, promotionsVisees, restitutionsEtudiants, statutEvaluation } from "./suivi-evaluation";

const SANS_ETUDIANTS = { aujourdhui: "2026-11-17", moduleEleves: false, idsEtudiants: [] };
const AVEC_ETUDIANTS = { aujourdhui: "2026-11-17", moduleEleves: true, idsEtudiants: ["a", "b"] };
const items = [{ code: "C1.1", op: "" }, { code: "C2.1", op: "g" }, { code: "C3.1", op: "g" }];

describe("statutEvaluation", () => {
  it("dit « brouillon » ou « annulée » avant tout le reste", () => {
    expect(statutEvaluation({ brouillon: true, suivi: { restitue: "2026-11-01" } }, SANS_ETUDIANTS)).toBe("brouillon");
    expect(statutEvaluation({ annulee: "2026-11-01" }, SANS_ETUDIANTS)).toBe("annulee");
  });

  it("dit « préparée » tant que rien n'est daté ni fait", () => {
    expect(statutEvaluation({ distribPrev: "2026-12-01" }, SANS_ETUDIANTS)).toBe("prep");
  });

  it("dit « distribuée » puis « rendus à évaluer » quand les dates prévues sont passées", () => {
    expect(statutEvaluation({ distribPrev: "2026-11-10" }, SANS_ETUDIANTS)).toBe("distrib");
    expect(statutEvaluation({ distribPrev: "2026-11-10", renduPrev: "2026-11-17" }, SANS_ETUDIANTS)).toBe("rendu");
  });

  it("sans module Étudiants, une grille exportée met l'évaluation en cours", () => {
    expect(statutEvaluation({ suivi: { exporte: "2026-11-12" } }, SANS_ETUDIANTS)).toBe("evalcours");
    expect(statutEvaluation({ suivi: { exporte: "2026-11-12" } }, { ...AVEC_ETUDIANTS, idsEtudiants: [] })).toBe("prep");
  });

  it("avec le module Étudiants, suit la saisie : en cours, puis évaluée quand tous sont saisis", () => {
    const enCours = { items, res: { a: { n: { "one:C1.1": 2, "op:g": 1 } } } };
    expect(statutEvaluation(enCours, AVEC_ETUDIANTS)).toBe("evalcours");
    const complete = { items, res: { a: { n: { "one:C1.1": 2, "op:g": 1 } }, b: { nr: "2026-11-15" } } };
    expect(statutEvaluation(complete, AVEC_ETUDIANTS)).toBe("eval");
  });

  it("dit « restituée en partie » puis « restituée » selon les promotions ou les étudiants", () => {
    expect(statutEvaluation({ classes: ["DNO2", "DNE2"], restit: { DNO2: "2026-11-16" } }, SANS_ETUDIANTS)).toBe("restpart");
    expect(statutEvaluation({ classes: ["DNO2"], restit: { DNO2: "2026-11-16" } }, SANS_ETUDIANTS)).toBe("restit");
    expect(statutEvaluation({ res: { a: { rest: "2026-11-16" } } }, AVEC_ETUDIANTS)).toBe("restpart");
    expect(statutEvaluation({ res: { a: { rest: "x" }, b: { rest: "y" } } }, AVEC_ETUDIANTS)).toBe("restit");
  });

  it("ignore les restitutions par étudiant sans le module Étudiants", () => {
    expect(statutEvaluation({ res: { a: { rest: "2026-11-16" } } }, { ...SANS_ETUDIANTS, idsEtudiants: ["a"] })).toBe("prep");
  });
});

describe("avancementSaisie", () => {
  it("compte un étudiant non rendu ou dispensé comme complet", () => {
    expect(avancementSaisie({ items, res: { a: { disp: "2026-11-01" } } }, ["a", "b"])).toEqual({ any: 1, full: 1, tot: 2 });
  });

  it("ne compte pas un niveau vide comme saisi", () => {
    expect(avancementSaisie({ items, res: { a: { n: { "one:C1.1": "" } } } }, ["a"])).toEqual({ any: 0, full: 0, tot: 1 });
  });

  it("sans ligne à évaluer, personne n'est complet", () => {
    expect(avancementSaisie({ items: [], res: { a: { n: {} } } }, ["a"])).toEqual({ any: 0, full: 0, tot: 1 });
  });
});

describe("restitutionsEtudiants et promotionsVisees", () => {
  it("compte les étudiants à qui l'évaluation a été restituée", () => {
    expect(restitutionsEtudiants({ res: { a: { rest: "2026-11-16" }, b: {} } }, ["a", "b", "c"])).toEqual({ n: 1, tot: 3 });
  });

  it("lit l'ancienne promotion unique quand il n'y a pas de liste", () => {
    expect(promotionsVisees({ classe: "DNO2" })).toEqual(["DNO2"]);
    expect(promotionsVisees({ classes: [], classe: "" })).toEqual([]);
  });
});

describe("estEvaluee", () => {
  it("vaut vrai à partir d'« évaluée », jamais pour un brouillon", () => {
    expect([estEvaluee("eval"), estEvaluee("restit"), estEvaluee("evalcours"), estEvaluee("brouillon")]).toEqual([true, true, false, false]);
  });
});
