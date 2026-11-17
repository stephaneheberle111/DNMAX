// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { basculerSemestreRecherche, competencesDuGroupe, pairesRecherche, regrouperPaires, sansSeparateurs, surligner, type OutilsRegroupement } from "./exploration";

const competences = [
  {
    code: "C1.1",
    libelle: "Utiliser les outils numériques",
    bloc: "1",
    ecs: [
      { ec: "EC 1.1", id: "e1", nom: "Outils", ue: "UE Méthodes", sem: "S1", dn: "DNO1", couleur: "#111111" },
      { ec: "EC 3.1", id: "e3", nom: "Outils avancés", ue: "UE Méthodes", sem: "S3", dn: "DNO2" },
    ],
  },
  { code: "C2.1", libelle: "Écrire", bloc: "2", ecs: [{ ec: "EC 2.1", id: "e2", nom: "Écriture", ue: "UE Humanités", sem: "S2", dn: "DNO1" }] },
];
const recherche = (changements: Partial<{ q: string; sems: string[]; annee: string }> = {}): { q: string; sems: string[]; annee: string } => ({ q: "", sems: [], annee: "*", ...changements });
const sansFiltre = { kind: "", value: "" };
const nomBloc = (numero: unknown): string => `Bloc nommé ${String(numero)}`;

describe("sansSeparateurs", () => {
  it("ne garde que lettres, chiffres et points, sans accents", () => {
    expect(sansSeparateurs("EC 11.2 — Écrire")).toBe("ec11.2ecrire");
  });
});

describe("pairesRecherche", () => {
  it("donne une paire par compétence et par EC à un semestre, sans recherche", () => {
    expect(pairesRecherche(competences, sansFiltre, recherche(), nomBloc).map((paire) => [paire.c.code, paire.ec, paire.annee])).toEqual([
      ["C1.1", "EC 1.1", 1],
      ["C1.1", "EC 3.1", 2],
      ["C2.1", "EC 2.1", 1],
    ]);
  });

  it("trouve une compétence par son intitulé sans accents, et un EC par son code écrit sans espace", () => {
    expect(pairesRecherche(competences, sansFiltre, recherche({ q: "ecrire" }), nomBloc).map((paire) => paire.c.code)).toEqual(["C2.1"]);
    expect(pairesRecherche(competences, sansFiltre, recherche({ q: "ec3.1" }), nomBloc).map((paire) => paire.ec)).toEqual(["EC 3.1"]);
  });

  it("trouve une compétence par le nom de son bloc", () => {
    expect(pairesRecherche(competences, sansFiltre, recherche({ q: "nommé 2" }), nomBloc).map((paire) => paire.c.code)).toEqual(["C2.1"]);
  });

  it("réduit aux semestres et à l'année choisis", () => {
    expect(pairesRecherche(competences, sansFiltre, recherche({ sems: ["S3"] }), nomBloc).map((paire) => paire.ec)).toEqual(["EC 3.1"]);
    expect(pairesRecherche(competences, sansFiltre, recherche({ annee: "1" }), nomBloc).map((paire) => paire.ec)).toEqual(["EC 1.1", "EC 2.1"]);
  });

  it("applique le filtre posé depuis la carte (bloc, compétence, UE, EC)", () => {
    expect(pairesRecherche(competences, { kind: "bloc", value: "2" }, recherche(), nomBloc)).toHaveLength(1);
    expect(pairesRecherche(competences, { kind: "comp", value: "C1.1" }, recherche(), nomBloc)).toHaveLength(2);
    expect(pairesRecherche(competences, { kind: "ue", value: "UE Humanités" }, recherche(), nomBloc).map((paire) => paire.ec)).toEqual(["EC 2.1"]);
    expect(pairesRecherche(competences, { kind: "ec", value: "e3" }, recherche(), nomBloc).map((paire) => paire.ec)).toEqual(["EC 3.1"]);
  });

  it("ne rend rien quand rien ne correspond", () => {
    expect(pairesRecherche(competences, sansFiltre, recherche({ q: "zzz" }), nomBloc)).toEqual([]);
  });
});

describe("regrouperPaires", () => {
  const outils: OutilsRegroupement = {
    nomBloc,
    rangUe: (ue) => (ue === "UE Méthodes" ? 0 : 1),
    couleurUe: () => "#ue",
    couleurEc: () => "#ec",
    sousTitreAnnee: (paire) => `Semestres de l'année ${String(paire.annee)}`,
    sousTitreSemestre: (paire) => `Année ${String(paire.annee)}`,
    diplome: "DN MADE mention Objet",
  };
  const paires = pairesRecherche(competences, sansFiltre, recherche(), nomBloc);

  it("regroupe par bloc, dans l'ordre des numéros, avec les semestres et EC de chaque compétence", () => {
    const groupes = regrouperPaires(paires, "bloc", outils);
    expect(groupes.map((groupe) => [groupe.libelle, groupe.sousTitre, groupe.couleur])).toEqual([
      ["Bloc 1", "Bloc nommé 1", null],
      ["Bloc 2", "Bloc nommé 2", null],
    ]);
    const [premier] = groupes;
    const [premiere] = premier === undefined ? [] : competencesDuGroupe(premier);
    expect([...(premiere?.sems ?? [])]).toEqual(["S1", "S3"]);
    expect([...(premiere?.ecs ?? [])]).toEqual(["EC 1.1", "EC 3.1"]);
  });

  it("regroupe par UE et par EC, avec leur couleur", () => {
    expect(regrouperPaires(paires, "ue", outils).map((groupe) => [groupe.libelle, groupe.couleur])).toEqual([
      ["UE Méthodes", "#ue"],
      ["UE Humanités", "#ue"],
    ]);
    expect(regrouperPaires(paires, "ec", outils).map((groupe) => [groupe.libelle, groupe.sousTitre, groupe.couleur])).toEqual([
      ["EC 1.1", "Outils · UE Méthodes", "#111111"],
      ["EC 2.1", "Écriture · UE Humanités", "#ec"],
      ["EC 3.1", "Outils avancés · UE Méthodes", "#ec"],
    ]);
  });

  it("regroupe par année, par semestre, ou tout ensemble", () => {
    expect(regrouperPaires(paires, "annee", outils).map((groupe) => groupe.libelle)).toEqual(["Année 1", "Année 2"]);
    expect(regrouperPaires(paires, "semestre", outils).map((groupe) => groupe.libelle)).toEqual(["S1", "S2", "S3"]);
    expect(regrouperPaires(paires, "aucun", outils).map((groupe) => [groupe.libelle, groupe.sousTitre])).toEqual([["Toutes les compétences", "DN MADE mention Objet"]]);
  });
});

describe("competencesDuGroupe", () => {
  it("range les compétences par bloc puis par code", () => {
    const groupes = regrouperPaires(pairesRecherche(competences, sansFiltre, recherche(), nomBloc), "aucun", {
      nomBloc,
      rangUe: () => 0,
      couleurUe: () => "",
      couleurEc: () => "",
      sousTitreAnnee: () => "",
      sousTitreSemestre: () => "",
      diplome: "",
    });
    const [unique] = groupes;
    expect(unique === undefined ? [] : competencesDuGroupe(unique).map((element) => element.c.code)).toEqual(["C1.1", "C2.1"]);
  });
});

describe("surligner", () => {
  it("marque la première occurrence de la recherche, accents ignorés, en gardant le texte d'origine", () => {
    expect(surligner("Écrire un texte", "ecrire")).toEqual([
      { texte: "", marque: false },
      { texte: "Écrire", marque: true },
      { texte: " un texte", marque: false },
    ]);
  });

  it("rend le texte entier sans recherche ou sans occurrence", () => {
    expect(surligner("Écrire", "")).toEqual([{ texte: "Écrire", marque: false }]);
    expect(surligner("Écrire", "lire")).toEqual([{ texte: "Écrire", marque: false }]);
  });
});

describe("basculerSemestreRecherche", () => {
  it("ajoute ou retire un semestre en gardant l'ordre, et « Tous » vide la sélection", () => {
    expect(basculerSemestreRecherche(["S3"], "S1")).toEqual(["S1", "S3"]);
    expect(basculerSemestreRecherche(["S1", "S3"], "S1")).toEqual(["S3"]);
    expect(basculerSemestreRecherche(["S1"], "*")).toEqual([]);
  });
});
