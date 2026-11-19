// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide, type Objet } from "./etat";
import { CH_KINDS, chainItemText, chainModel, chainNode } from "./chaine-modele";
import { anneeScolaire } from "./promotions-calendrier";

function ids(liste: Objet[] | undefined): unknown[] {
  return (liste ?? []).map((element) => element.id);
}

beforeEach(() => {
  Object.assign(etat, etatVide());
  etat.donnees = {
    activeDiplome: "d1",
    diplomes: [{ id: "d1", nom: "DN MADE", mention: "Objet" }],
    ues: [
      { id: "u1", nom: "UE 1" },
      { id: "u2", nom: "UE 2" },
    ],
    ecs: [
      { id: "e1", ueId: "u1", nom: "Dessin", codes: { 1: "EC 1.1" }, sems: ["S1", "S2"] },
      { id: "e2", ueId: "u2", nom: "Volume", codes: { 1: "EC 1.2" }, sems: ["S2"] },
    ],
    competences: [
      { id: "c1", code: "C1.1", bloc: 1, libelle: "Dessiner", ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S1"] }] },
      { id: "c2", code: "C2.1", bloc: 2, libelle: "Modeler", ecIds: ["e2"], ecs: [{ id: "e2", sems: ["S2"] }] },
    ],
  };
  etat.ui = { ref: { filter: { kind: "", value: "" } } };
});

describe("ordre des colonnes", () => {
  it("met le semestre en premier, puis la compétence, l'EC, l'UE et le diplôme", () => {
    expect([...CH_KINDS]).toEqual(["sem", "comp", "ec", "ue", "dip"]);
  });
});

describe("chainModel", () => {
  it("prend par défaut la première compétence pour pivot, et ne garde que ce qui lui est lié", () => {
    const modele = chainModel();
    expect(modele?.kind).toBe("comp");
    expect(modele?.piv.id).toBe("c1");
    expect(modele?.p).toBe(1);
    expect(ids(modele?.sets[0])).toEqual(["S1"]);
    expect(ids(modele?.sets[2])).toEqual(["e1"]);
    expect(ids(modele?.sets[3])).toEqual(["u1"]);
    expect((etat.ui.ref as Objet).piv).toEqual({ kind: "comp", id: "c1" });
  });

  it("verrouille la roue sur le semestre choisi", () => {
    (etat.ui.ref as Objet).piv = { kind: "sem", id: "S2" };
    const modele = chainModel();
    expect(modele?.p).toBe(0);
    expect(ids(modele?.sets[1])).toEqual(["c2"]);
    expect(ids(modele?.sets[2])).toEqual(["e2"]);
  });

  it("reprend la compétence demandée par son code quand aucun pivot n'est retenu", () => {
    (etat.ui.ref as Objet).chain = "C2.1";
    expect(chainModel()?.piv.id).toBe("c2");
  });

  it("respecte le filtre des tuiles", () => {
    (etat.ui.ref as Objet).filter = { kind: "ue", value: "UE 2" };
    (etat.ui.ref as Objet).piv = { kind: "ec", id: "" };
    const modele = chainModel();
    expect(modele?.items.map((ec) => ec.id)).toEqual(["e2"]);
  });

  it("revient aux compétences pour une sorte de pivot inconnue", () => {
    (etat.ui.ref as Objet).piv = { kind: "inconnue", id: "" };
    expect(chainModel()?.kind).toBe("comp");
  });

  it("ne montre rien sans compétence", () => {
    etat.donnees.competences = [];
    expect(chainModel()).toBeNull();
  });

  it("relie un semestre à une compétence, et une compétence à un EC, seulement par un triplet réel", () => {
    const modele = chainModel();
    const [c1] = etat.donnees.competences as Objet[];
    expect(modele?.rel("sem", { id: "S1", sem: "S1" }, c1 as Objet)).toBe(true);
    expect(modele?.rel("sem", { id: "S2", sem: "S2" }, c1 as Objet)).toBe(false);
    expect(modele?.rel("comp", c1 as Objet, { id: "e1" })).toBe(true);
    expect(modele?.rel("comp", c1 as Objet, { id: "e2" })).toBe(false);
  });
});

describe("chainItemText et chainNode", () => {
  it("écrit le texte de chaque sorte de case", () => {
    expect(chainItemText("sem", { num: "3", annee: 2 })).toEqual({ code: "", label: "Semestre 3 · année 2" });
    expect(chainItemText("dip", { nom: "DN MADE", mention: "Objet" }).label).toBe("DN MADE · mention Objet");
    expect(chainItemText("dip", {}).label).toBe("Aucun diplôme");
    expect(chainItemText("comp", { code: "C1", libelle: "" }).label).toBe("C1");
  });

  it("donne au moins 34 de haut à une case, plus pour un code, des lignes et un sous-titre", () => {
    expect(chainNode({ t: [] }).h).toBe(34);
    expect(chainNode({ code: "C1", t: ["a", "b", "c"], sub: "s" }).h).toBe(13 + 37.5 + 13 + 14);
  });
});

describe("chainModel avec « Seulement ma répartition de service »", () => {
  it("ne garde que mes EC, leurs compétences, leurs UE et leurs semestres", () => {
    etat.donnees.moi = "t1";
    etat.donnees.affectH = { [anneeScolaire()]: { p1: { e2: ["t1"] } } };
    (etat.ui.ref as Objet).mine = true;
    (etat.ui.ref as Objet).piv = { kind: "ec", id: "" };
    const modele = chainModel();
    expect(modele?.items.map((ec) => ec.id)).toEqual(["e2"]);
    expect(ids(modele?.sets[1])).toEqual(["c2"]);
    expect(ids(modele?.sets[0])).toEqual(["S2"]);
    expect(ids(modele?.sets[3])).toEqual(["u2"]);
  });
});

describe("chainModel avec un autre ordre des colonnes", () => {
  it("suit l'ordre retenu dans les préférences et relie les colonnes devenues voisines", () => {
    etat.preferences = { chaineOrdre: ["ue", "sem", "dip", "comp", "ec"] };
    (etat.ui.ref as Objet).piv = { kind: "ec", id: "e1" };
    const modele = chainModel();
    expect(modele?.ordre).toEqual(["ue", "sem", "dip", "comp", "ec"]);
    expect(modele?.p).toBe(4);
    expect(ids(modele?.sets[0])).toEqual(["u1"]);
    expect(ids(modele?.sets[1])).toEqual(["S1"]);
    expect(ids(modele?.sets[3])).toEqual(["c1"]);
    const [u1] = etat.donnees.ues as Objet[];
    expect(modele?.rel("ue", u1 as Objet, { id: "S1", sem: "S1" })).toBe(true);
    expect(modele?.rel("ue", u1 as Objet, { id: "S2", sem: "S2" })).toBe(false);
  });

  it("revient à l'ordre par défaut quand l'ordre enregistré n'est pas valable", () => {
    etat.preferences = { chaineOrdre: ["ue", "ue", "dip", "comp", "ec"] };
    expect(chainModel()?.ordre).toEqual(["sem", "comp", "ec", "ue", "dip"]);
  });

  it("range les compétences au barycentre des semestres, l'ordre chronologique des semestres restant fixe", () => {
    etat.donnees.competences = [
      { id: "c2", code: "C2.1", bloc: 2, libelle: "Modeler", ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S1"] }] },
      { id: "c1", code: "C1.1", bloc: 1, libelle: "Dessiner", ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S2"] }] },
    ];
    (etat.ui.ref as Objet).piv = { kind: "ec", id: "e1" };
    const modele = chainModel();
    expect(ids(modele?.sets[0])).toEqual(["S1", "S2"]);
    expect(ids(modele?.sets[1])).toEqual(["c2", "c1"]);
  });

  it("range aussi les colonnes éloignées du pivot, de proche en proche, pour ne croiser aucun lien", () => {
    etat.donnees.competences = [
      { id: "c1", code: "C1.1", bloc: 1, libelle: "Dessiner", ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S2"] }] },
      { id: "c2", code: "C2.1", bloc: 2, libelle: "Modeler", ecIds: ["e2"], ecs: [{ id: "e2", sems: ["S1"] }] },
    ];
    (etat.ui.ref as Objet).piv = { kind: "dip", id: "d1" };
    const modele = chainModel();
    expect(ids(modele?.sets[0])).toEqual(["S1", "S2"]);
    expect(ids(modele?.sets[1])).toEqual(["c2", "c1"]);
    expect(ids(modele?.sets[2])).toEqual(["e2", "e1"]);
    expect(ids(modele?.sets[3])).toEqual(["u2", "u1"]);
  });

  it("garde l'ordre des listes quand il ne croise aucun lien", () => {
    (etat.ui.ref as Objet).piv = { kind: "dip", id: "d1" };
    const modele = chainModel();
    expect(ids(modele?.sets[1])).toEqual(["c1", "c2"]);
    expect(ids(modele?.sets[2])).toEqual(["e1", "e2"]);
    expect(ids(modele?.sets[3])).toEqual(["u1", "u2"]);
  });
});
