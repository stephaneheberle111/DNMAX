// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { completerPersonne, composerNom, lignesNoms, nouvellePersonne, separerPrenomNom } from "./personnes";

describe("separerPrenomNom", () => {
  it("prend le premier mot pour le prénom et le reste pour le nom", () => {
    expect(separerPrenomNom("Camille  Durand de la Tour")).toEqual({ prenom: "Camille", nomFam: "Durand de la Tour" });
  });

  it("sépare deux colonnes collées d'un tableur à la tabulation, prénom composé compris", () => {
    expect(separerPrenomNom("Jean  Pierre\tMartin")).toEqual({ prenom: "Jean Pierre", nomFam: "Martin" });
  });

  it("met un mot seul dans le nom, et rend deux champs vides pour une saisie vide ou absente", () => {
    expect(separerPrenomNom("Durand")).toEqual({ prenom: "", nomFam: "Durand" });
    expect(separerPrenomNom(undefined)).toEqual({ prenom: "", nomFam: "" });
  });
});

describe("composerNom", () => {
  it("joint prénom et nom par une espace, espaces superflues retirées", () => {
    expect(composerNom("  Camille ", "Durand  de  la Tour")).toBe("Camille Durand de la Tour");
  });

  it("omet la partie vide", () => {
    expect(composerNom("", "Durand")).toBe("Durand");
    expect(composerNom(undefined, null)).toBe("");
  });
});

describe("completerPersonne", () => {
  it("tire prénom et nom du nom affiché quand ils manquent, sur place", () => {
    const personne: Record<string, unknown> = { id: "t1", nom: "Camille Durand" };
    expect(completerPersonne(personne)).toBe(personne);
    expect(personne).toMatchObject({ prenom: "Camille", nomFam: "Durand" });
  });

  it("garde prénom et nom déjà saisis, même vides", () => {
    const personne = { id: "t1", nom: "Camille Durand", prenom: "", nomFam: "Durand" };
    expect(completerPersonne(personne)).toEqual({ id: "t1", nom: "Camille Durand", prenom: "", nomFam: "Durand" });
  });
});

describe("nouvellePersonne", () => {
  it("crée une personne à partir d'une ligne saisie", () => {
    expect(nouvellePersonne("s1", "Linh Tran")).toEqual({ id: "s1", prenom: "Linh", nomFam: "Tran", nom: "Linh Tran" });
  });
});

describe("lignesNoms", () => {
  it("rend une ligne non vide par nom, sans espaces autour, fins de ligne Windows comprises", () => {
    expect(lignesNoms(" Linh Tran \r\n\r\n  Noé Baptiste\n")).toEqual(["Linh Tran", "Noé Baptiste"]);
  });

  it("rend une liste vide pour une saisie vide ou absente", () => {
    expect(lignesNoms("")).toEqual([]);
    expect(lignesNoms(null)).toEqual([]);
  });
});
