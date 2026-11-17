// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  basculerSemestre,
  candidatsAjout,
  codesEnDouble,
  elementNeuf,
  libelleElement,
  retirerDuReferentiel,
  sansAccents,
} from "./constituer";

describe("sansAccents", () => {
  it("met en minuscules et retire les accents", () => {
    expect(sansAccents("Éléments d'Écriture")).toBe("elements d'ecriture");
  });

  it("rend une chaîne vide pour une valeur absente", () => {
    expect(sansAccents(null)).toBe("");
  });
});

describe("libelleElement", () => {
  it("nomme une UE par son code et son nom, ou « UE sans nom »", () => {
    expect(libelleElement("ues", { code: "UE 1", nom: "Humanités" })).toBe("UE 1 · Humanités");
    expect(libelleElement("ues", {})).toBe("UE sans nom");
  });

  it("nomme un EC par son intitulé, un bloc par son numéro et son intitulé", () => {
    expect(libelleElement("ecs", {})).toBe("EC sans intitulé");
    expect(libelleElement("blocs", { num: "3", nom: "Concevoir" })).toBe("Bloc 3 · Concevoir");
    expect(libelleElement("blocs", { num: "3" })).toBe("Bloc 3");
  });

  it("coupe l'intitulé d'une compétence à soixante-dix caractères", () => {
    expect(libelleElement("competences", { code: "C1.1", libelle: "x".repeat(80) })).toBe(`C1.1 · ${"x".repeat(70)}`);
    expect(libelleElement("competences", {})).toBe("C · ");
  });
});

describe("candidatsAjout", () => {
  it("propose les éléments connus qui ne sont pas dans ce référentiel", () => {
    expect(candidatsAjout([{ id: "a" }], [{ id: "a" }, { id: "b" }]).map((element) => element.id)).toEqual(["b"]);
  });

  it("ne propose rien quand tout est déjà retenu", () => {
    expect(candidatsAjout([{ id: "a" }], [{ id: "a" }])).toEqual([]);
  });
});

describe("elementNeuf", () => {
  const vue = { ues: [{ id: "u1" }], blocs: [{ num: "2" }, { num: "x" }, { num: "7" }], competences: [{ bloc: "2" }, { bloc: 2 }, { bloc: "3" }] };

  it("crée une UE numérotée à la suite, ouverte sur les six semestres", () => {
    expect(elementNeuf("ues", vue, "", "u9")).toEqual({ id: "u9", code: "UE 2", nom: "Nouvelle UE", couleur: "#9aa2ae", sems: ["S1", "S2", "S3", "S4", "S5", "S6"] });
  });

  it("crée un EC rattaché à la première UE", () => {
    expect(elementNeuf("ecs", vue, "", "e9")).toEqual({ id: "e9", nom: "Nouvel enseignement", couleur: "#9aa2ae", ects: "", ueId: "u1", sems: [], codes: {} });
  });

  it("numérote un nouveau bloc après le plus grand numéro", () => {
    expect(elementNeuf("blocs", vue, "", "b9")).toEqual({ id: "b9", num: "8", nom: "" });
  });

  it("code une compétence d'après son bloc, et « C » sans bloc", () => {
    expect(elementNeuf("competences", vue, "2", "c9")).toMatchObject({ code: "C2.3", bloc: "2" });
    expect(elementNeuf("competences", vue, "", "c9")).toEqual({ id: "c9", code: "C", bloc: "", libelle: "", ecs: [], ecIds: [] });
  });
});

describe("codesEnDouble", () => {
  it("signale un code porté deux fois, sans tenir compte de la casse, des accents ni des espaces autour", () => {
    const double = codesEnDouble([{ code: "UE 1" }, { code: " ue 1 " }, { code: "UE 2" }], "code");
    expect(double({ code: "UE 1" })).toBe(true);
    expect(double({ code: "UE 2" })).toBe(false);
  });

  it("ne signale jamais un code vide", () => {
    expect(codesEnDouble([{ code: "" }, { code: " " }], "code")({ code: "" })).toBe(false);
  });
});

describe("basculerSemestre", () => {
  it("ajoute un semestre en gardant l'ordre des semestres", () => {
    const element: Record<string, unknown> = { sems: ["S4", "S1"] };
    basculerSemestre(element, "S2");
    expect(element.sems).toEqual(["S1", "S2", "S4"]);
  });

  it("retire un semestre déjà présent, et crée la liste quand elle manque", () => {
    const element: Record<string, unknown> = { sems: ["S1", "S2"] };
    basculerSemestre(element, "S1");
    expect(element.sems).toEqual(["S2"]);
    const vide: Record<string, unknown> = {};
    basculerSemestre(vide, "S3");
    expect(vide.sems).toEqual(["S3"]);
  });
});

describe("retirerDuReferentiel", () => {
  it("retire une UE et détache ses EC", () => {
    const referentiel = { ues: [{ id: "u1" }], ecs: [{ id: "e1", ueId: "u1" }], blocs: [], competences: [] };
    retirerDuReferentiel(referentiel, "ues", "u1");
    expect(referentiel).toEqual({ ues: [], ecs: [{ id: "e1", ueId: "" }], blocs: [], competences: [] });
  });

  it("retire un EC et ses rattachements aux compétences", () => {
    const referentiel = { ues: [], ecs: [{ id: "e1" }], blocs: [], competences: [{ id: "c1", ecs: [{ id: "e1" }, { id: "e2" }] }, { id: "c2" }] };
    retirerDuReferentiel(referentiel, "ecs", "e1");
    expect(referentiel.competences).toEqual([{ id: "c1", ecs: [{ id: "e2" }] }, { id: "c2", ecs: [] }]);
  });

  it("retire un bloc sans toucher aux compétences", () => {
    const referentiel = { ues: [], ecs: [], blocs: [{ id: "b1" }], competences: [{ id: "c1", bloc: "1" }] };
    retirerDuReferentiel(referentiel, "blocs", "b1");
    expect(referentiel).toEqual({ ues: [], ecs: [], blocs: [], competences: [{ id: "c1", bloc: "1" }] });
  });
});
