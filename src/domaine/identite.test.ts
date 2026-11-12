// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { LONGUEUR_MAXIMALE_NOM, creerIdentite, lireIdentite, nettoyerNom, separerNom } from "./identite";

describe("nettoyerNom", () => {
  it("retire les espaces superflus", () => {
    expect(nettoyerNom("  Camille \n  Ferrand ")).toBe("Camille Ferrand");
  });

  it("borne la longueur en caractères", () => {
    expect(Array.from(nettoyerNom("é".repeat(200)))).toHaveLength(LONGUEUR_MAXIMALE_NOM);
  });
});

describe("creerIdentite", () => {
  it("crée une identité à partir du prénom et du nom saisis à part", () => {
    expect(creerIdentite(" Camille ", " Ferrand ", "poste-1")).toEqual({
      id: "poste-1",
      nom: "Camille Ferrand",
      prenom: "Camille",
      nomFamille: "Ferrand",
    });
  });

  it("garde un prénom composé et un nom en plusieurs mots", () => {
    expect(creerIdentite("Jean Pierre", "De La Tour", "poste-1")?.nom).toBe("Jean Pierre De La Tour");
  });

  it("refuse un prénom ou un nom vide ou blanc", () => {
    expect(creerIdentite("", "Ferrand", "poste-1")).toBeNull();
    expect(creerIdentite("Camille", "   ", "poste-1")).toBeNull();
  });
});

describe("lireIdentite", () => {
  it("relit une identité enregistrée", () => {
    expect(lireIdentite('{"id":"poste-1","nom":"Jean Pierre De La Tour","prenom":"Jean Pierre","nomFamille":"De La Tour"}')).toEqual({
      id: "poste-1",
      nom: "Jean Pierre De La Tour",
      prenom: "Jean Pierre",
      nomFamille: "De La Tour",
    });
  });

  it("sépare une identité enregistrée avant la saisie en deux champs", () => {
    expect(lireIdentite('{"id":"poste-1","nom":"Camille Ferrand"}')).toEqual({
      id: "poste-1",
      nom: "Camille Ferrand",
      prenom: "Camille",
      nomFamille: "Ferrand",
    });
  });

  it("rend null pour une identité absente, illisible ou incomplète", () => {
    expect(lireIdentite(undefined)).toBeNull();
    expect(lireIdentite("pas du json")).toBeNull();
    expect(lireIdentite('{"id":"poste-1"}')).toBeNull();
    expect(lireIdentite('{"id":"","nom":"Camille"}')).toBeNull();
    expect(lireIdentite('{"id":"poste-1","nom":"  "}')).toBeNull();
  });
});

describe("separerNom", () => {
  it("prend le premier mot pour le prénom et le reste pour le nom", () => {
    expect(separerNom("Camille De La Tour")).toEqual({ prenom: "Camille", nomFamille: "De La Tour" });
  });

  it("met un nom d'un seul mot dans le nom de famille", () => {
    expect(separerNom("Ferrand")).toEqual({ prenom: "", nomFamille: "Ferrand" });
  });
});
