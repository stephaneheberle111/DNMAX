// SPDX-License-Identifier: CECILL-2.1
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluationLecture, evaluationMobilier, evaluationSoutenance, type ContexteDetaille } from "../exemple";
import { extraireModele } from "./modele-evaluation";
import { lirePaquet } from "./paquet";
import { LONGUEURS, TAILLES, bornerPromotion, estJsonBorne, lireElementDictionnaire, lireElementStructure, lireModeleRecu } from "./schema-recu";

const DOSSIER_REFERENTIELS = new URL("../../../site/referentiels/", import.meta.url);

function contexteExemple(): ContexteDetaille {
  let rang = 0;
  return {
    competence: (code) => ({ code }),
    ecsRetenus: () => ["EC 11.1", "EC 11.2"],
    nouvelIdentifiant: () => `x${String(rang++)}`,
    maintenant: Date.parse("2026-03-09T10:00:00.000Z"),
    niveaux: ["Insuffisant", "Fragile", "Satisfaisant", "Très bonne maîtrise"],
  };
}

describe("aller-retour : rien de ce que l'application produit n'est perdu", () => {
  it.each([
    ["mobilier", evaluationMobilier],
    ["lecture", evaluationLecture],
    ["soutenance", evaluationSoutenance],
  ])("le modèle de l'évaluation d'exemple « %s » traverse le schéma à l'identique", (_nom, fabriquer) => {
    const modele = extraireModele({ ...fabriquer(contexteExemple()), id: "eval1" });
    expect(lireModeleRecu(JSON.parse(JSON.stringify(modele)))).toEqual(modele);
  });

  it("garde tous les champs partagés d'une évaluation", () => {
    const modele = {
      id: "eval1",
      titre: "Titre",
      consignes: "Consignes",
      livrables: ["Carnet"],
      semestre: "S3",
      semManuel: true,
      classes: ["DNO2"],
      classe: "DNO2",
      prof: "Camille Ferrand",
      profs: ["Camille Ferrand"],
      ues: ["UE 1"],
      ecCodes: ["EC 1.1"],
      compCode: "C1.1",
      ops: [{ id: "op1", libelle: "Regrouper", livrables: ["Carnet"] }],
      items: [{ code: "C1.1", ecs: ["EC 1.1"], op: "op1", libelle: "Formuler", livrables: ["Carnet"] }],
      preset: "maitrise",
      niveaux: ["Insuffisant", "Fragile"],
      opts: { crit: true, obs: false },
      distribPrev: "2026-03-01",
      renduPrev: "2026-03-20",
      annulee: true,
    };
    expect(lireModeleRecu(structuredClone(modele))).toEqual(modele);
  });

  it("les référentiels livrés avec l'application traversent la lecture à l'identique", () => {
    const fichiers = readdirSync(DOSSIER_REFERENTIELS).filter((nom) => nom.endsWith(".dnmax"));
    expect(fichiers.length).toBeGreaterThan(0);
    for (const nom of fichiers) {
      const texte = readFileSync(new URL(nom, DOSSIER_REFERENTIELS), "utf8");
      const brut = JSON.parse(texte) as { referentiels: { structure: unknown; dictionnaire: unknown; contenuLisible: unknown }[] };
      const paquet = lirePaquet(texte);
      expect(typeof paquet).toBe("object");
      if (typeof paquet === "object") {
        expect(paquet.referentiels.map((referentiel) => referentiel.structure)).toEqual(brut.referentiels.map((referentiel) => referentiel.structure));
        expect(paquet.referentiels.map((referentiel) => referentiel.dictionnaire)).toEqual(brut.referentiels.map((referentiel) => referentiel.dictionnaire));
      }
    }
  });

  it("garde un élément neuf tel que « Constituer » le crée", () => {
    expect(lireElementDictionnaire("ues", { id: "u9", code: "UE 5", nom: "Nouvelle UE", couleur: "#9aa2ae" })).toEqual({ id: "u9", code: "UE 5", nom: "Nouvelle UE", couleur: "#9aa2ae" });
    expect(lireElementStructure("ecs", { id: "e9", ueId: "u9", sems: [], ects: "", codes: {} })).toEqual({ id: "e9", ueId: "u9", sems: [], ects: "", codes: {} });
    expect(lireElementStructure("competences", { id: "c9", bloc: "2", ecs: [{ id: "e9", sems: null }], ecIds: ["e9"] })).toEqual({ id: "c9", bloc: "2", ecs: [{ id: "e9", sems: null }], ecIds: ["e9"] });
  });
});

describe("lireModeleRecu", () => {
  it("écarte sans bruit un champ inconnu, local ou d'étudiants", () => {
    const modele = lireModeleRecu({ id: "eval1", titre: "T", inconnu: { a: 1 }, res: { e1: {} }, eleves: "Nom", promoId: "p1", suivi: {}, brouillon: true });
    expect(modele).toEqual({ id: "eval1", titre: "T" });
  });

  it("écarte un champ qui n'a pas le type attendu", () => {
    const modele = lireModeleRecu({ id: "eval1", titre: ["a"], prof: ["M. X", "HYPERLINK()"], consignes: 12, opts: "oui", semManuel: "non", livrables: "Carnet" });
    expect(modele).toEqual({ id: "eval1" });
  });

  it("ne garde d'une liste que ses textes, et d'une ligne que ses champs connus", () => {
    const modele = lireModeleRecu({ id: "eval1", livrables: ["Carnet", 3, null, { f: "=1" }], items: [{ code: "C1.1", f: "=1", op: "pas un id !" }, { libelle: "sans code" }, "texte"] });
    expect(modele).toEqual({ id: "eval1", livrables: ["Carnet"], items: [{ code: "C1.1" }] });
  });

  it("coupe un texte et une liste démesurés", () => {
    const modele = lireModeleRecu({ id: "eval1", titre: "a".repeat(LONGUEURS.nom + 50), items: Array.from({ length: TAILLES.longue + 5 }, (_, rang) => ({ code: `C${String(rang)}` })) });
    expect((modele?.titre as string).length).toBe(LONGUEURS.nom);
    expect(modele?.items as unknown[]).toHaveLength(TAILLES.longue);
  });

  it("refuse ce qui n'est pas un objet ou n'a pas d'identifiant valide", () => {
    expect(lireModeleRecu(null)).toBeNull();
    expect(lireModeleRecu([])).toBeNull();
    expect(lireModeleRecu({ titre: "sans identifiant" })).toBeNull();
    expect(lireModeleRecu({ id: "<b>" })).toBeNull();
  });
});

describe("éléments de référentiel", () => {
  it("écarte les champs qui ne sont pas ceux de la sorte", () => {
    expect(lireElementStructure("blocs", { id: "b1", sems: ["S1"], nom: "ne vit pas ici" })).toEqual({ id: "b1" });
    expect(lireElementDictionnaire("competences", { id: "c1", code: "C1.1", libelle: "L", couleur: "#fff", script: "x" })).toEqual({ id: "c1", code: "C1.1", libelle: "L" });
  });

  it("ne garde des codes par année que les années et les textes, et des liens que ceux qui désignent un EC", () => {
    expect(lireElementStructure("ecs", { id: "e1", codes: { 1: "EC 1.1", toujours: "x", 2: 5 } })).toEqual({ id: "e1", codes: { 1: "EC 1.1" } });
    expect(lireElementStructure("competences", { id: "c1", ecs: [{ id: "e1", sems: ["S1", 2] }, { id: "a b" }, "e3"] })).toEqual({ id: "c1", ecs: [{ id: "e1", sems: ["S1"] }] });
  });

  it("refuse un élément sans identifiant valide", () => {
    expect(lireElementStructure("ues", { sems: [] })).toBeNull();
    expect(lireElementDictionnaire("ues", "u1")).toBeNull();
  });
});

describe("estJsonBorne", () => {
  it("accepte un contenu ordinaire", () => {
    expect(estJsonBorne({ meta: { niveaux: [{ label: "Initié", annee: 1 }] }, competences: [{ code: "C1.1", ecs: [{ ec: "EC 1.1" }] }], vide: null, vrai: true })).toBe(true);
  });

  it("refuse un texte, une liste ou une profondeur démesurés, et un nombre qui n'en est pas un", () => {
    expect(estJsonBorne({ a: "x".repeat(20_001) })).toBe(false);
    expect(estJsonBorne(Array.from({ length: 5001 }, () => 0))).toBe(false);
    let profond: unknown = 0;
    for (let niveau = 0; niveau < 14; niveau++) profond = [profond];
    expect(estJsonBorne(profond)).toBe(false);
    expect(estJsonBorne({ a: Number.NaN })).toBe(false);
  });
});

describe("bornerPromotion", () => {
  it("garde une promotion ordinaire telle quelle", () => {
    const promotion = { id: "p1", nom: "DNO 2025", diplome: "DN MADE", mention: "Objet", debut: 2025, eleves: [{ id: "s1", nom: "Étudiant Fictif" }] };
    expect(bornerPromotion(promotion)).toEqual(promotion);
  });

  it("oublie une année impossible et un étudiant sans identifiant valide", () => {
    const promotion = { id: "p1", nom: "N", diplome: "D", mention: "M", debut: 2025.5, eleves: [{ id: "s 1", nom: "A" }, { id: "s2", nom: "B" }] };
    expect(bornerPromotion(promotion)).toEqual({ ...promotion, debut: null, eleves: [{ id: "s2", nom: "B" }] });
  });
});

describe("lirePaquet avec le schéma", () => {
  it("ne laisse entrer ni champ inconnu ni formule dans un modèle reçu", () => {
    const texte = JSON.stringify({ format: "dnmax-echange", version: 1, referentiels: [], evaluations: [{ modele: { id: "eval1", titre: "T", prof: ["M. X", "HYPERLINK()"], piege: { a: 1 } } }] });
    const paquet = lirePaquet(texte);
    expect(typeof paquet === "object" && paquet.evaluations[0]?.modele).toEqual({ id: "eval1", titre: "T" });
  });

  it("écarte un référentiel dont le contenu lisible est démesuré", () => {
    const referentiel = { diplome: "D", mention: "M", empreinte: "e", dateVersion: "", structure: { ues: [], ecs: [], blocs: [], competences: [] }, dictionnaire: { ues: [], ecs: [], blocs: [], competences: [] }, contenuLisible: { a: "x".repeat(20_001) } };
    const paquet = lirePaquet(JSON.stringify({ format: "dnmax-echange", version: 1, evaluations: [], referentiels: [referentiel] }));
    expect(typeof paquet === "object" && paquet.referentiels).toEqual([]);
  });
});
