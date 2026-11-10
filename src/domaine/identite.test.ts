// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { LONGUEUR_MAXIMALE_NOM, creerIdentite, lireIdentite, nettoyerNom } from "./identite";

describe("nettoyerNom", () => {
  it("retire les espaces superflus", () => {
    expect(nettoyerNom("  Camille \n  Ferrand ")).toBe("Camille Ferrand");
  });

  it("borne la longueur en caractères", () => {
    expect(Array.from(nettoyerNom("é".repeat(200)))).toHaveLength(LONGUEUR_MAXIMALE_NOM);
  });
});

describe("creerIdentite", () => {
  it("crée une identité à partir d'un nom saisi", () => {
    expect(creerIdentite(" Camille Ferrand ", "poste-1")).toEqual({ id: "poste-1", nom: "Camille Ferrand" });
  });

  it("refuse un nom vide ou blanc", () => {
    expect(creerIdentite("", "poste-1")).toBeNull();
    expect(creerIdentite("   ", "poste-1")).toBeNull();
  });
});

describe("lireIdentite", () => {
  it("relit une identité enregistrée", () => {
    expect(lireIdentite('{"id":"poste-1","nom":"Camille Ferrand"}')).toEqual({ id: "poste-1", nom: "Camille Ferrand" });
  });

  it("rend null pour une identité absente, illisible ou incomplète", () => {
    expect(lireIdentite(undefined)).toBeNull();
    expect(lireIdentite("pas du json")).toBeNull();
    expect(lireIdentite('{"id":"poste-1"}')).toBeNull();
    expect(lireIdentite('{"id":"","nom":"Camille"}')).toBeNull();
    expect(lireIdentite('{"id":"poste-1","nom":"  "}')).toBeNull();
  });
});
