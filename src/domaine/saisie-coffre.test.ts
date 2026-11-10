// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { estJeuEntrees, verifierNouveauMotDePasse } from "./saisie-coffre";

describe("verifierNouveauMotDePasse", () => {
  it("accepte un mot de passe assez long et confirmé", () => {
    expect(verifierNouveauMotDePasse("12345678", "12345678")).toBeNull();
  });

  it("refuse un mot de passe de sept caractères", () => {
    expect(verifierNouveauMotDePasse("1234567", "1234567")).toBe("trop-court");
  });

  it("refuse un mot de passe vide", () => {
    expect(verifierNouveauMotDePasse("", "")).toBe("trop-court");
  });

  it("compte un émoji pour un seul caractère", () => {
    expect(verifierNouveauMotDePasse("🪑🪑🪑🪑", "🪑🪑🪑🪑")).toBe("trop-court");
    expect(verifierNouveauMotDePasse("🪑🪑🪑🪑🪑🪑🪑🪑", "🪑🪑🪑🪑🪑🪑🪑🪑")).toBeNull();
  });

  it("refuse une confirmation différente", () => {
    expect(verifierNouveauMotDePasse("12345678", "12345679")).toBe("confirmation-differente");
  });

  it("distingue les majuscules dans la confirmation", () => {
    expect(verifierNouveauMotDePasse("Tabouret", "tabouret")).toBe("confirmation-differente");
  });
});

describe("estJeuEntrees", () => {
  it("accepte un objet de textes, même vide", () => {
    expect(estJeuEntrees({})).toBe(true);
    expect(estJeuEntrees({ a: "1", b: "" })).toBe(true);
  });

  it("refuse une valeur qui n'est pas un texte", () => {
    expect(estJeuEntrees({ a: 1 })).toBe(false);
    expect(estJeuEntrees({ a: null })).toBe(false);
  });

  it("refuse ce qui n'est pas un objet simple", () => {
    expect(estJeuEntrees(null)).toBe(false);
    expect(estJeuEntrees(["a"])).toBe(false);
    expect(estJeuEntrees("texte")).toBe(false);
    expect(estJeuEntrees(undefined)).toBe(false);
  });
});
