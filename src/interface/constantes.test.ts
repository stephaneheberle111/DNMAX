// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { norm, publierConstantes, tidy } from "./constantes";
import { SEMESTRES } from "../domaine/constituer";
import { ECHELLE } from "../domaine/evaluation";

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

describe("publierConstantes", () => {
  it("publie les constantes sous leurs noms historiques", () => {
    const fenetre: Record<string, unknown> = {};
    publierConstantes(fenetre);
    expect(Object.keys(fenetre).sort()).toEqual(["GROUPS", "PRESETS", "SEMS", "SUPPORTS_DEF", "norm", "tidy"]);
    expect(fenetre["SEMS"]).toEqual(["S1", "S2", "S3", "S4", "S5", "S6"]);
    expect(fenetre["PRESETS"]).toEqual({ maitrise: { nom: "Niveaux de maîtrise", niveaux: [...ECHELLE.niveaux] } });
    expect((fenetre["SUPPORTS_DEF"] as string[]).length).toBe(10);
    expect(fenetre["GROUPS"]).toHaveProperty("liste", "Liste à plat");
  });

  it("donne des copies : les modifier ne touche pas aux constantes du domaine", () => {
    const fenetre: Record<string, unknown> = {};
    publierConstantes(fenetre);
    (fenetre["SEMS"] as string[]).push("S7");
    ((fenetre["PRESETS"] as { maitrise: { niveaux: string[] } }).maitrise.niveaux).pop();
    expect(SEMESTRES).toHaveLength(6);
    expect(ECHELLE.niveaux).toHaveLength(4);
  });
});
