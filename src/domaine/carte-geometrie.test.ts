// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { arcPath, fitN, polar, wrapN } from "./carte-geometrie";

describe("arcPath", () => {
  it("trace un quart d'anneau, coordonnées arrondies au centième", () => {
    expect(arcPath(0, 0, 1, 2, 0, Math.PI / 2)).toBe("M2.00 0.00A2 2 0 0 1 0.00 2.00L0.00 1.00A1 1 0 0 0 1.00 0.00Z");
  });

  it("prend le grand arc au-delà d'un demi-tour", () => {
    expect(arcPath(0, 0, 1, 2, 0, Math.PI * 1.5)).toContain("A2 2 0 1 1");
  });

  it("garde le petit arc à exactement un demi-tour", () => {
    expect(arcPath(0, 0, 1, 2, 0, Math.PI)).toContain("A2 2 0 0 1");
  });
});

describe("polar", () => {
  it("place un point autour du centre", () => {
    const [x, y] = polar(10, 5, Math.PI / 2);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(15);
  });
});

describe("wrapN", () => {
  it("coupe un libellé en lignes d'au plus n caractères", () => {
    expect(wrapN("Outils d'expression et d'exploration créative", 14, 5)).toEqual(["Outils", "d'expression", "et", "d'exploration", "créative"]);
  });

  it("coupe un mot trop long par un tiret, ou l'abrège avec cut", () => {
    expect(wrapN("Anticonstitutionnellement", 10, 5)).toEqual(["Anticonst-", "itutionne-", "llement"]);
    expect(wrapN("Anticonstitutionnellement", 10, 5, true)).toEqual(["Anticonst…"]);
  });

  it("finit la dernière ligne permise par des points de suspension", () => {
    expect(wrapN("un deux trois quatre cinq", 5, 2)).toEqual(["un", "deux…"]);
  });

  it("rend aucune ligne pour un texte vide ou absent", () => {
    expect(wrapN("", 10, 3)).toEqual([]);
    expect(wrapN(null, 10, 3)).toEqual([]);
  });
});

describe("fitN", () => {
  it("déduit la longueur des lignes de la largeur et de la taille de police", () => {
    expect(fitN("Méthodologies, techniques et langues", 10, 12, 55)).toEqual(["Méthodolo…", "techniques", "et langues"]);
  });

  it("garde au moins trois caractères par ligne et une ligne", () => {
    expect(fitN("Volume", 40, 50, 10)).toEqual(["Vo…"]);
  });
});
