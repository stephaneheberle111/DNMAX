// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  basculerSemestre,
  blocCorrespond,
  blocsRanges,
  candidatsAjout,
  changerCodeEc,
  codesEc,
  codesEnDouble,
  competenceCorrespond,
  competencesDuBloc,
  competencesSansBloc,
  ecsAffiches,
  elementNeuf,
  libelleElement,
  lignesIntitule,
  numeroCode,
  ordreEc,
  rattachementsLus,
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

describe("numeroCode", () => {
  it("range EC 11.2 après EC 2.10, par numéro puis sous-numéro", () => {
    expect(numeroCode("EC 11.2")).toBe(1102);
    expect(numeroCode("EC 2.10")).toBe(210);
    expect(numeroCode("C4")).toBe(400);
  });

  it("met à la fin un code sans chiffre ou absent", () => {
    expect(numeroCode("EC")).toBe(9999);
    expect(numeroCode(undefined)).toBe(9999);
  });
});

describe("codesEc et ordreEc", () => {
  it("donne les codes d'un EC de la 1re à la 3e année, sans les années vides", () => {
    expect(codesEc({ codes: { 3: "EC 19.2", 1: "EC 1.2", 2: "" } })).toEqual(["EC 1.2", "EC 19.2"]);
    expect(codesEc({})).toEqual([]);
  });

  it("range un EC d'après son premier code, et un EC sans code à la fin", () => {
    expect(ordreEc({ codes: { 2: "EC 11.2" } })).toBe(1102);
    expect(ordreEc({ codes: {} })).toBe(9999);
  });
});

describe("ecsAffiches", () => {
  const ecs = [
    { id: "b", nom: "Pratique plastique", codes: { 1: "EC 11.2" } },
    { id: "a", nom: "Humanités", codes: { 1: "EC 1.1" } },
    { id: "c", nom: "Sans code", codes: {} },
  ];

  it("range les EC par code", () => {
    expect(ecsAffiches(ecs, "").map((ec) => ec.id)).toEqual(["a", "b", "c"]);
  });

  it("filtre sur les codes et l'intitulé, sans tenir compte de la casse ni des accents", () => {
    expect(ecsAffiches(ecs, "  HUMANITES ").map((ec) => ec.id)).toEqual(["a"]);
    expect(ecsAffiches(ecs, "11.2").map((ec) => ec.id)).toEqual(["b"]);
  });

  it("ne rend rien quand rien ne correspond", () => {
    expect(ecsAffiches(ecs, "zzz")).toEqual([]);
  });
});

describe("changerCodeEc", () => {
  it("écrit le code d'une année, sans espaces autour", () => {
    const ec: Record<string, unknown> = { codes: { 1: "EC 1.1" } };
    changerCodeEc(ec, "2", " EC 9.1 ");
    expect(ec.codes).toEqual({ 1: "EC 1.1", 2: "EC 9.1" });
  });

  it("efface le code d'une année laissée vide, et crée la table des codes quand elle manque", () => {
    const ec: Record<string, unknown> = { codes: { 1: "EC 1.1" } };
    changerCodeEc(ec, "1", "  ");
    expect(ec.codes).toEqual({});
    const sansCodes: Record<string, unknown> = { codes: "abîmé" };
    changerCodeEc(sansCodes, "3", "EC 3.1");
    expect(sansCodes.codes).toEqual({ 3: "EC 3.1" });
  });
});

describe("blocsRanges et competencesDuBloc", () => {
  it("range les blocs par numéro, un numéro illisible en tête", () => {
    expect(blocsRanges([{ num: "10" }, { num: "2" }, { num: "x" }]).map((bloc) => bloc.num)).toEqual(["x", "2", "10"]);
  });

  it("donne les compétences d'un bloc, rangées par code", () => {
    const competences = [{ code: "C2.10", bloc: "2" }, { code: "C2.2", bloc: 2 }, { code: "C3.1", bloc: "3" }];
    expect(competencesDuBloc(competences, "2").map((competence) => competence.code)).toEqual(["C2.2", "C2.10"]);
  });

  it("met à part les compétences dont le bloc n'est pas dans ce référentiel", () => {
    expect(competencesSansBloc([{ bloc: "1" }, { bloc: "" }, { bloc: "9" }], [{ num: "1" }]).map((competence) => competence.bloc)).toEqual(["", "9"]);
  });
});

describe("filtre de l'étape 3", () => {
  it("retient une compétence dont le code ou l'intitulé contient le filtre, accents ignorés", () => {
    expect(competenceCorrespond({ code: "C1.1", libelle: "Créer" }, "creer")).toBe(true);
    expect(competenceCorrespond({ code: "C1.1", libelle: "Créer" }, "dessin")).toBe(false);
    expect(competenceCorrespond({ code: "C1.1" }, "")).toBe(true);
  });

  it("montre tout un bloc dont le numéro ou l'intitulé contient le filtre, et jamais sans filtre", () => {
    expect(blocCorrespond({ num: "3", nom: "Concevoir" }, "concev")).toBe(true);
    expect(blocCorrespond({ num: "3", nom: "Concevoir" }, "")).toBe(false);
  });
});

describe("lignesIntitule", () => {
  it("donne deux à cinq lignes selon la longueur de l'intitulé", () => {
    expect(lignesIntitule("")).toBe(2);
    expect(lignesIntitule("x".repeat(200))).toBe(3);
    expect(lignesIntitule("x".repeat(1000))).toBe(5);
  });
});

describe("rattachementsLus", () => {
  const ecs = [
    { id: "e1", nom: "Pratique", couleur: "#123456", codes: { 1: "EC 11.1", 2: "EC 11.2" } },
    { id: "e2", nom: "", codes: { 3: "EC 19.4" } },
    { id: "e3", nom: "Sans code", codes: {} },
  ];

  it("résume chaque EC rattaché par ses codes aux semestres, sans répéter « EC »", () => {
    const lus = rattachementsLus({ ecs: [{ id: "e1", sems: ["S1", "S2", "S3"] }] }, ecs);
    expect(lus).toEqual({ pastilles: [{ couleur: "#123456", titre: "Pratique · S1 S2 S3", texte: "EC 11.1 · 11.2" }], enPlus: 0 });
  });

  it("nomme un EC sans code à ces semestres, et ignore un rattachement sans semestre ou vers un EC absent", () => {
    const lus = rattachementsLus({ ecs: [{ id: "e3", sems: ["S1"] }, { id: "e1", sems: [] }, { id: "perdu", sems: ["S1"] }] }, ecs);
    expect(lus.pastilles).toEqual([{ couleur: "#9aa2ae", titre: "Sans code · S1", texte: "Sans code" }]);
  });

  it("montre cinq rattachements et compte les autres", () => {
    const lus = rattachementsLus({ ecs: Array.from({ length: 7 }, () => ({ id: "e2", sems: ["S5"] })) }, ecs);
    expect(lus.pastilles).toHaveLength(5);
    expect(lus.pastilles[0]).toEqual({ couleur: "#9aa2ae", titre: "EC 19.4 · S5", texte: "EC 19.4" });
    expect(lus.enPlus).toBe(2);
  });

  it("ne rend rien pour une compétence sans rattachement", () => {
    expect(rattachementsLus({}, ecs)).toEqual({ pastilles: [], enPlus: 0 });
  });
});
