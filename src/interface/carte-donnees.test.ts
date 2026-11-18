// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide, type Objet } from "./etat";
import { compsOfEc, ecName, filtComps, filtEcs, filtUes, publierCarteDonnees, radialGroups, refFilter, semItems, semLie } from "./carte-donnees";

function filtrer(kind: string, value: string): void {
  (etat.ui.ref as Objet).filter = { kind, value };
}

beforeEach(() => {
  Object.assign(etat, etatVide());
  etat.donnees = {
    ues: [
      { id: "u1", nom: "UE 1" },
      { id: "u2", nom: "UE 2" },
    ],
    ecs: [
      { id: "e2", ueId: "u1", nom: "Volume", codes: { 1: "EC 1.2" }, sems: ["S1", "S3"] },
      { id: "e1", ueId: "u1", nom: "Dessin", codes: { 1: "EC 1.1" }, sems: ["S2"] },
      { id: "e3", ueId: "u9", nom: "", codes: { 2: "EC 9.1" }, sems: [] },
    ],
    competences: [
      { code: "C1", bloc: 1, ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S2"] }] },
      { code: "C2", bloc: 2, ecIds: ["e1", "e2"] },
    ],
  };
  etat.ui = { ref: { filter: { kind: "", value: "" } } };
});

describe("publierCarteDonnees", () => {
  it("publie les données et les calculs de la carte sous leurs noms historiques", () => {
    const fenetre: Record<string, unknown> = {};
    publierCarteDonnees(fenetre);
    for (const nom of ["arcPath", "polar", "wrapN", "fitN", "refFilter", "radialGroups", "semItems", "ecName"]) expect(typeof fenetre[nom]).toBe("function");
  });
});

describe("refFilter", () => {
  it("garde un filtre valide", () => {
    filtrer("bloc", "2");
    expect(refFilter()).toEqual({ kind: "bloc", value: "2" });
  });

  it("remet à vide une sorte inconnue, ou un filtre « EC » qui porte un ancien code", () => {
    filtrer("diplome", "d1");
    expect(refFilter()).toEqual({ kind: "", value: "" });
    filtrer("ec", "EC 1.1");
    expect(refFilter()).toEqual({ kind: "", value: "" });
    expect((etat.ui.ref as Objet).filter).toEqual({ kind: "", value: "" });
  });
});

describe("filtres", () => {
  it("garde l'UE de l'EC filtré, et seulement lui", () => {
    filtrer("ec", "e2");
    expect(filtUes(etat.donnees.ues as Objet[]).map((ue) => ue.id)).toEqual(["u1"]);
    expect(filtEcs(etat.donnees.ecs as Objet[]).map((ec) => ec.id)).toEqual(["e2"]);
  });

  it("filtre les compétences par bloc ou par code, et laisse tout sans filtre", () => {
    const competences = etat.donnees.competences as Objet[];
    filtrer("bloc", "2");
    expect(filtComps(competences).map((competence) => competence.code)).toEqual(["C2"]);
    filtrer("comp", "C1");
    expect(filtComps(competences).map((competence) => competence.code)).toEqual(["C1"]);
    filtrer("", "");
    expect(filtComps(competences)).toHaveLength(2);
  });
});

describe("radialGroups", () => {
  it("range les EC de chaque UE, retire les UE vides et ajoute les EC sans UE", () => {
    expect(radialGroups().map((groupe) => [groupe.u.nom, groupe.ecs.map((ec) => ec.id)])).toEqual([
      ["UE 1", ["e1", "e2"]],
      ["Sans UE", ["e3"]],
    ]);
  });

  it("n'ajoute pas les EC sans UE sous un filtre par UE", () => {
    filtrer("ue", "UE 1");
    expect(radialGroups().map((groupe) => groupe.u.nom)).toEqual(["UE 1"]);
  });
});

describe("compétences, semestres et noms", () => {
  it("liste les compétences d'un EC", () => {
    expect(compsOfEc("e1").map((competence) => competence.code)).toEqual(["C1", "C2"]);
    expect(compsOfEc("absent")).toEqual([]);
  });

  it("donne les semestres assurés, dans l'ordre, avec leur année", () => {
    expect(semItems(etat.donnees.ecs as Objet[])).toEqual([
      { id: "S1", sem: "S1", annee: 1, num: "1" },
      { id: "S2", sem: "S2", annee: 1, num: "2" },
      { id: "S3", sem: "S3", annee: 2, num: "3" },
    ]);
    expect(semItems(null)).toEqual([]);
  });

  it("dit si une compétence est liée à un semestre", () => {
    const [c1, c2] = etat.donnees.competences as Objet[];
    expect(semLie(c1, { sem: "S2" })).toBe(true);
    expect(semLie(c2, { sem: "S2" })).toBe(false);
    expect(semLie(null, { sem: "S2" })).toBe(false);
  });

  it("nomme un EC par son nom, sinon par ses codes", () => {
    const ecs = etat.donnees.ecs as Objet[];
    expect(ecName(ecs[0])).toBe("Volume");
    expect(ecName(ecs[2])).toBe("EC 9.1");
    expect(ecName(null)).toBe("");
  });
});
