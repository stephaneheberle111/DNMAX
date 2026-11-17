// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { nomDuNiveau, positionAuClavier } from "./jauge";

const NIVEAUX = ["Insuffisant", "Fragile", "Satisfaisant", "Très bonne maîtrise"];

describe("nomDuNiveau", () => {
  it("nomme le niveau atteint par une position", () => {
    expect(nomDuNiveau(70, NIVEAUX)).toBe("Satisfaisant");
  });

  it("ne nomme rien quand rien n'est saisi", () => {
    expect(nomDuNiveau(null, NIVEAUX)).toBe("");
  });
});

describe("positionAuClavier", () => {
  it("part de 0 sur une jauge vide", () => {
    expect(positionAuClavier("ArrowRight", false, null, 4)).toBe(0);
  });

  it("saute du premier niveau, qui vaut 0, au début du deuxième", () => {
    expect(positionAuClavier("ArrowRight", false, 0, 4)).toBe(15);
  });

  it("avance de 10 avec Maj", () => {
    expect(positionAuClavier("ArrowRight", true, 20, 4)).toBe(30);
  });

  it("revient du dernier niveau, qui vaut 100, dans l'avant-dernier", () => {
    expect(positionAuClavier("ArrowLeft", false, 100, 4)).toBe(84);
  });

  it("efface avec Suppr et ignore une autre touche", () => {
    expect(positionAuClavier("Delete", false, 50, 4)).toBeNull();
    expect(positionAuClavier("a", false, 50, 4)).toBeUndefined();
  });
});
