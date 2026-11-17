// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { basculerLien, blocsPlanification, colonnesPlanification, groupesPlanification, liensVisibles } from "./planification";

const ues = [
  { id: "u1", nom: "Humanités", couleur: "#111111" },
  { id: "u2", nom: "Ateliers" },
];
const ecs = [
  { id: "e2", ueId: "u1", sems: ["S2", "S1"], codes: { 1: "EC 2.1" } },
  { id: "e1", ueId: "u1", sems: ["S1"], codes: { 1: "EC 1.1" } },
  { id: "e3", ueId: "u2", sems: [] },
  { id: "e4", ueId: "perdue", sems: ["S3"] },
];

describe("groupesPlanification", () => {
  it("range les EC de chaque UE par code, et réunit les EC sans UE connue sous « Sans unité »", () => {
    const groupes = groupesPlanification(ues, ecs, "");
    expect(groupes.map((groupe) => [groupe.ue.nom, groupe.ecs.map((ec) => ec.id)])).toEqual([
      ["Humanités", ["e1", "e2"]],
      ["Ateliers", ["e3"]],
      ["Sans unité", ["e4"]],
    ]);
    expect(groupes[2]?.ue).toEqual({ id: "", nom: "Sans unité", couleur: "#9aa2ae" });
  });

  it("ne garde, pour un semestre, que les EC ouverts ce semestre et les UE qui en ont", () => {
    expect(groupesPlanification(ues, ecs, "S2").map((groupe) => groupe.ecs.map((ec) => ec.id))).toEqual([["e2"]]);
  });

  it("ne rend aucun groupe sans EC", () => {
    expect(groupesPlanification(ues, [], "")).toEqual([]);
  });
});

describe("colonnesPlanification", () => {
  it("donne une colonne par semestre ouvert de chaque EC, et une colonne vide pour un EC sans semestre", () => {
    const colonnes = colonnesPlanification(groupesPlanification(ues, ecs, ""), "");
    expect(colonnes.map((colonne) => [colonne.ec.id, colonne.semestre, colonne.alterne, colonne.finEc, colonne.finUe])).toEqual([
      ["e1", "S1", false, true, false],
      ["e2", "S1", true, false, false],
      ["e2", "S2", true, true, true],
      ["e3", "", false, true, true],
      ["e4", "S3", true, true, true],
    ]);
  });

  it("réduit les colonnes au semestre choisi", () => {
    const colonnes = colonnesPlanification(groupesPlanification(ues, ecs, "S1"), "S1");
    expect(colonnes.map((colonne) => [colonne.ec.id, colonne.semestre])).toEqual([
      ["e1", "S1"],
      ["e2", "S1"],
    ]);
  });
});

describe("blocsPlanification", () => {
  it("range les blocs par numéro, un numéro qui n'est pas un nombre comptant pour zéro", () => {
    expect(blocsPlanification([{ num: "10" }, { num: "2a" }, { num: "3" }]).map((bloc) => bloc.num)).toEqual(["2a", "3", "10"]);
  });
});

describe("liensVisibles", () => {
  it("compte les rattachements de la compétence visibles dans les colonnes", () => {
    const colonnes = colonnesPlanification(groupesPlanification(ues, ecs, "S1"), "S1");
    const competence = { ecs: [{ id: "e1", sems: ["S1"] }, { id: "e2", sems: ["S2"] }, { id: "e4", sems: ["S3"] }] };
    expect(liensVisibles(competence, colonnes)).toBe(1);
  });

  it("rend zéro sans rattachement", () => {
    expect(liensVisibles({}, [])).toBe(0);
  });
});

describe("basculerLien", () => {
  it("rattache la compétence à l'EC pour le semestre, en gardant les semestres dans l'ordre", () => {
    const competence: Record<string, unknown> = { ecs: [{ id: "e1", sems: ["S3"] }] };
    expect(basculerLien(competence, "e1", "S1")).toBe(true);
    expect(competence).toEqual({ ecs: [{ id: "e1", sems: ["S1", "S3"] }], ecIds: ["e1"] });
  });

  it("crée le rattachement à un nouvel EC", () => {
    const competence: Record<string, unknown> = {};
    expect(basculerLien(competence, "e2", "S2")).toBe(true);
    expect(competence).toEqual({ ecs: [{ id: "e2", sems: ["S2"] }], ecIds: ["e2"] });
  });

  it("retire le dernier semestre et, avec lui, le rattachement", () => {
    const competence: Record<string, unknown> = { ecs: [{ id: "e1", sems: ["S1"] }, { id: "e2", sems: ["S2"] }] };
    expect(basculerLien(competence, "e1", "S1")).toBe(false);
    expect(competence).toEqual({ ecs: [{ id: "e2", sems: ["S2"] }], ecIds: ["e2"] });
  });
});
