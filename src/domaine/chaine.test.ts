// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { cheminsReels, estOrdreParDefaut, ordreChaineValide, passagesParLePivot, placerColonne, SORTES_CHAINE, type CheminChaine } from "./chaine";

describe("ordreChaineValide", () => {
  it("garde un ordre qui donne les cinq sortes, chacune une fois", () => {
    expect(ordreChaineValide(["dip", "ue", "ec", "comp", "sem"])).toEqual(["dip", "ue", "ec", "comp", "sem"]);
  });

  it("revient à l'ordre par défaut pour un doublon, une sorte inconnue ou une sorte manquante", () => {
    expect(ordreChaineValide(["sem", "sem", "ec", "ue", "dip"])).toEqual([...SORTES_CHAINE]);
    expect(ordreChaineValide(["sem", "comp", "ec", "ue", "bloc"])).toEqual([...SORTES_CHAINE]);
    expect(ordreChaineValide(["sem", "comp", "ec", "ue"])).toEqual([...SORTES_CHAINE]);
  });

  it("revient à l'ordre par défaut pour une valeur absente ou qui n'est pas une liste", () => {
    expect(ordreChaineValide(undefined)).toEqual([...SORTES_CHAINE]);
    expect(ordreChaineValide("sem,comp,ec,ue,dip")).toEqual([...SORTES_CHAINE]);
  });

  it("rend une copie : modifier le résultat ne touche pas l'ordre par défaut", () => {
    const ordre = ordreChaineValide(null);
    ordre.reverse();
    expect(SORTES_CHAINE[0]).toBe("sem");
  });
});

describe("estOrdreParDefaut", () => {
  it("reconnaît l'ordre par défaut, et lui seul", () => {
    expect(estOrdreParDefaut(["sem", "comp", "ec", "ue", "dip"])).toBe(true);
    expect(estOrdreParDefaut(["comp", "sem", "ec", "ue", "dip"])).toBe(false);
    expect(estOrdreParDefaut([])).toBe(false);
  });
});

describe("placerColonne", () => {
  it("place la colonne au rang demandé, les autres gardant leur ordre", () => {
    expect(placerColonne([...SORTES_CHAINE], "dip", 0)).toEqual(["dip", "sem", "comp", "ec", "ue"]);
    expect(placerColonne([...SORTES_CHAINE], "sem", 2)).toEqual(["comp", "ec", "sem", "ue", "dip"]);
  });

  it("laisse l'ordre inchangé quand la colonne est déjà à ce rang", () => {
    expect(placerColonne([...SORTES_CHAINE], "ec", 2)).toEqual([...SORTES_CHAINE]);
  });

  it("ramène un rang hors bornes à la première ou à la dernière place", () => {
    expect(placerColonne([...SORTES_CHAINE], "ec", -3)).toEqual(["ec", "sem", "comp", "ue", "dip"]);
    expect(placerColonne([...SORTES_CHAINE], "sem", 99)).toEqual(["comp", "ec", "ue", "dip", "sem"]);
  });
});

describe("cheminsReels", () => {
  const competences = [
    { id: "c1", ecs: [{ id: "e1", sems: ["S1", "S2"] }, { id: "e2", sems: [] }] },
    { id: "c2", ecs: [{ id: "e3", sems: ["S3"] }] },
  ];
  const tout = { sem: new Set(["S1", "S2", "S3"]), comp: new Set(["c1", "c2"]), ec: new Set(["e1", "e2", "e3"]), ue: new Set(["u1"]) };
  const ueDe = (ec: string): unknown => ({ e1: "u1", e2: "u1", e3: "" })[ec];

  it("donne un chemin par rattachement d'une compétence à un EC à un semestre", () => {
    expect(cheminsReels({ competences, retenus: tout, ueDe, diplome: "d1" })).toEqual([
      { sem: "S1", comp: "c1", ec: "e1", ue: "u1", dip: "d1" },
      { sem: "S2", comp: "c1", ec: "e1", ue: "u1", dip: "d1" },
      { sem: "S3", comp: "c2", ec: "e3", ue: null, dip: "d1" },
    ]);
  });

  it("ne donne aucun chemin pour un rattachement sans semestre", () => {
    expect(cheminsReels({ competences, retenus: tout, ueDe, diplome: "d1" }).some((chemin) => chemin.ec === "e2")).toBe(false);
  });

  it("écarte ce qui n'est pas retenu (filtre des tuiles, ma répartition)", () => {
    const retenus = { ...tout, sem: new Set(["S2", "S3"]), comp: new Set(["c1"]) };
    expect(cheminsReels({ competences, retenus, ueDe, diplome: "d1" })).toEqual([{ sem: "S2", comp: "c1", ec: "e1", ue: "u1", dip: "d1" }]);
  });

  it("supporte une compétence sans rattachements", () => {
    expect(cheminsReels({ competences: [{ id: "c1" }], retenus: tout, ueDe, diplome: "d1" })).toEqual([]);
  });
});

describe("passagesParLePivot", () => {
  const chemins: CheminChaine[] = [
    { sem: "S1", comp: "c1", ec: "e1", ue: "u1", dip: "d1" },
    { sem: "S2", comp: "c2", ec: "e1", ue: "u1", dip: "d1" },
    { sem: "S3", comp: "c2", ec: "e3", ue: null, dip: "d1" },
  ];

  it("ne garde que les éléments des chemins qui passent par le pivot", () => {
    const passages = passagesParLePivot(chemins, SORTES_CHAINE, "comp", "c1");
    expect([...passages.presents.sem]).toEqual(["S1"]);
    expect([...passages.presents.ec]).toEqual(["e1"]);
  });

  it("relie deux colonnes voisines par un même chemin, et pas deux éléments de chemins différents", () => {
    const passages = passagesParLePivot(chemins, SORTES_CHAINE, "ec", "e1");
    expect(passages.relie(0, "S1", "c1")).toBe(true);
    expect(passages.relie(0, "S1", "c2")).toBe(false);
  });

  it("suit l'ordre choisi : semestre et UE voisins se relient", () => {
    const passages = passagesParLePivot(chemins, ["ue", "sem", "comp", "ec", "dip"], "dip", "d1");
    expect(passages.relie(0, "u1", "S2")).toBe(true);
    expect(passages.relie(1, "S1", "c1")).toBe(true);
    expect(passages.relie(0, "u1", "S3")).toBe(false);
  });

  it("prend tous les chemins quand le diplôme est verrouillé, et un trou d'UE ne relie rien", () => {
    const passages = passagesParLePivot(chemins, SORTES_CHAINE, "dip", "d1");
    expect([...passages.presents.comp]).toEqual(["c1", "c2"]);
    expect([...passages.presents.ue]).toEqual(["u1"]);
    expect(passages.relie(2, "e3", "u1")).toBe(false);
  });

  it("ne trouve rien quand aucun chemin ne passe par le pivot", () => {
    const passages = passagesParLePivot(chemins, SORTES_CHAINE, "sem", "S6");
    expect(passages.presents.comp.size).toBe(0);
  });
});
