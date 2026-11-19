// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { norm, tidy } from "./constantes";

describe("tidy", () => {
  it("recolle les capitales séparées par un trait d'union et retire les espaces de bord", () => {
    expect(tidy("  U-E 1  ")).toBe("UE 1");
  });

  it("laisse un trait d'union entre minuscules", () => {
    expect(tidy("Arts-appliqués")).toBe("Arts-appliqués");
  });

  it("rend un texte vide pour null et undefined, et convertit un nombre", () => {
    expect(tidy(null)).toBe("");
    expect(tidy(undefined)).toBe("");
    expect(tidy(12)).toBe("12");
  });
});

describe("norm", () => {
  it("met en minuscules et retire les accents", () => {
    expect(norm("Écriture Créative")).toBe("ecriture creative");
  });

  it("laisse un texte déjà simple inchangé", () => {
    expect(norm("design")).toBe("design");
  });

  it("rend un texte vide pour null et convertit un objet par String, comme l'historique", () => {
    expect(norm(null)).toBe("");
    expect(norm({})).toBe("[object object]");
  });
});

