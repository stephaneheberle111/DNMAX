// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { estJeuEntrees, longueurMinimaleExigee, verifierNouveauMotDePasse } from "./saisie-coffre";

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

describe("longueur exigée selon le module Élèves", () => {
  it("exige 12 caractères quand le module Élèves est actif", () => {
    expect(longueurMinimaleExigee(true)).toBe(12);
  });

  it("garde 8 caractères sans le module Élèves", () => {
    expect(longueurMinimaleExigee(false)).toBe(8);
  });

  it("refuse onze caractères quand le module Élèves est actif", () => {
    expect(verifierNouveauMotDePasse("12345678901", "12345678901", longueurMinimaleExigee(true))).toBe("trop-court");
  });

  it("accepte douze caractères quand le module Élèves est actif", () => {
    expect(verifierNouveauMotDePasse("123456789012", "123456789012", longueurMinimaleExigee(true))).toBeNull();
  });

  it("compte un émoji pour un caractère dans la règle renforcée", () => {
    const onzeEmojis = "🪑".repeat(11);
    expect(verifierNouveauMotDePasse(onzeEmojis, onzeEmojis, longueurMinimaleExigee(true))).toBe("trop-court");
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
