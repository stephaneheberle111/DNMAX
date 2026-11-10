// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { creerEntrees, creerEvaluation } from "./jeu-essai";
import { construirePaquet, lirePaquet } from "./paquet";

const MAINTENANT = new Date("2026-03-09T10:00:00.000Z");

describe("construirePaquet", () => {
  it("ne contient que les évaluations choisies, avec leur date et leur base", async () => {
    const entrees = creerEntrees([creerEvaluation(), creerEvaluation({ id: "eval2" })], {
      eval1: { le: "2026-02-01T00:00:00.000Z", par: "Noé Baptiste" },
    });
    const paquet = await construirePaquet(entrees, new Set(["eval1"]), MAINTENANT, "Camille Ferrand");
    expect(paquet.evaluations).toHaveLength(1);
    expect(paquet.evaluations[0]?.modifieLe).toBe("2026-02-01T00:00:00.000Z");
    expect(paquet.evaluations[0]?.modifiePar).toBe("Noé Baptiste");
    expect(paquet.expediteur).toBe("Camille Ferrand");
    expect(paquet.evaluations[0]?.base?.mention).toBe("Objet");
    expect(paquet.creeLe).toBe(MAINTENANT.toISOString());
  });

  it("n'écrit aucune donnée d'élève dans le fichier", async () => {
    const paquet = await construirePaquet(creerEntrees([creerEvaluation()]), new Set(["eval1"]), MAINTENANT, "Camille Ferrand");
    const texte = JSON.stringify(paquet);
    expect(texte).not.toContain("Élève Fictif");
    expect(texte).not.toContain("eleve1");
    expect(texte).not.toContain("suivi");
  });

  it("rend un paquet vide quand rien n'est choisi", async () => {
    const paquet = await construirePaquet(creerEntrees([creerEvaluation()]), new Set(), MAINTENANT, "Camille Ferrand");
    expect(paquet.evaluations).toEqual([]);
  });
});

describe("lirePaquet", () => {
  it("relit un paquet qu'il a lui-même construit", async () => {
    const paquet = await construirePaquet(creerEntrees([creerEvaluation()]), new Set(["eval1"]), MAINTENANT, "Camille Ferrand");
    expect(lirePaquet(JSON.stringify(paquet))).toEqual(paquet);
  });

  it("refuse un texte qui n'est pas du JSON ou pas un objet", () => {
    expect(lirePaquet("pas du json")).toBe("illisible");
    expect(lirePaquet("[]")).toBe("illisible");
    expect(lirePaquet("")).toBe("illisible");
  });

  it("refuse un autre format", () => {
    expect(lirePaquet('{"format":"dnmax-coffre","version":1}')).toBe("format-inconnu");
    expect(lirePaquet('{"format":"dnmax-echange"}')).toBe("format-inconnu");
  });

  it("refuse une version plus récente que celle qu'il connaît", () => {
    expect(lirePaquet('{"format":"dnmax-echange","version":2,"evaluations":[]}')).toBe("version-trop-recente");
  });

  it("refuse un paquet sans liste d'évaluations", () => {
    expect(lirePaquet('{"format":"dnmax-echange","version":1}')).toBe("illisible");
  });

  it("retire les données d'élèves qu'un fichier trafiqué contiendrait", () => {
    const trafique = {
      format: "dnmax-echange",
      version: 1,
      evaluations: [{ modele: creerEvaluation({ refV: "vX" }), modifieLe: "", base: null }],
    };
    const paquet = lirePaquet(JSON.stringify(trafique));
    expect(typeof paquet).toBe("object");
    expect(JSON.stringify(paquet)).not.toContain("Élève Fictif");
    expect(JSON.stringify(paquet)).not.toContain("vX");
  });

  it("nettoie les noms d'enseignants venus du fichier", () => {
    const texte = JSON.stringify({
      format: "dnmax-echange",
      version: 1,
      expediteur: "  Camille \n Ferrand ",
      evaluations: [{ modele: { id: "a" }, modifiePar: "x".repeat(500) }],
    });
    const paquet = lirePaquet(texte);
    expect(paquet).toMatchObject({ expediteur: "Camille Ferrand" });
    expect(typeof paquet === "object" && paquet.evaluations[0]?.modifiePar.length).toBe(80);
  });

  it("écarte les éléments mal formés et les doublons sans rejeter le reste", () => {
    const texte = JSON.stringify({
      format: "dnmax-echange",
      version: 1,
      evaluations: [
        { modele: { id: "a", titre: "A" }, modifieLe: 3, base: { diplome: 1 } },
        { modele: { titre: "sans identifiant" } },
        "n'importe quoi",
        { modele: { id: "a", titre: "doublon" } },
      ],
    });
    const paquet = lirePaquet(texte);
    expect(paquet).toMatchObject({
      expediteur: "",
      evaluations: [{ modele: { id: "a", titre: "A" }, modifieLe: "", modifiePar: "", base: null }],
    });
  });
});
