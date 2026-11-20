// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { TEINTE_BLOCS, teinteBlocsAffichee } from "./teinte-blocs";

describe("teinteBlocsAffichee", () => {
  it("remplace le vert d'eau d'origine par la teinte de l'identité", () => {
    expect(teinteBlocsAffichee("#D1F1DA")).toBe(TEINTE_BLOCS);
  });

  it("reconnaît le vert d'eau d'origine quelle que soit sa casse", () => {
    expect(teinteBlocsAffichee(" #d1f1da ")).toBe(TEINTE_BLOCS);
  });

  it("respecte une autre couleur portée par le référentiel", () => {
    expect(teinteBlocsAffichee("#FFD9B0")).toBe("#FFD9B0");
  });

  it("donne la teinte de l'identité quand le référentiel n'en porte pas", () => {
    expect(teinteBlocsAffichee(undefined)).toBe(TEINTE_BLOCS);
    expect(teinteBlocsAffichee("")).toBe(TEINTE_BLOCS);
    expect(teinteBlocsAffichee(42)).toBe(TEINTE_BLOCS);
  });
});
