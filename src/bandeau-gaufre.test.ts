// SPDX-License-Identifier: CECILL-2.1
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const INDEX = readFileSync(new URL("../index.html", import.meta.url), "utf8");

/** Le texte du bandeau, tel que le définit une page : le groupe `#bandeau-texte`. */
function texteDuBandeau(page: string): string {
  return /<g id="bandeau-texte"[^>]*>(.*?)<\/g>/s.exec(page)?.[1] ?? "";
}

describe("bandeau gaufré du fond de page", () => {
  it("écrit le nom du diplôme avec les 89 pièces de la planche", () => {
    expect(texteDuBandeau(INDEX).match(/<path /g)).toHaveLength(89);
  });

  it("remplace le X en creux", () => {
    expect(INDEX).not.toContain('class="fond-x"');
    expect(INDEX).toContain('id="fond-bandeau"');
  });

  it("est le même sur la page d'accueil du site", () => {
    const site = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
    expect(texteDuBandeau(site)).toBe(texteDuBandeau(INDEX));
  });

  it("superpose ombres, lumières et texte à la couleur du papier", () => {
    for (const couche of ["gaufre-ombre-large", "gaufre-lumiere-large", "gaufre-ombre", "gaufre-lumiere", "gaufre-fond"]) {
      expect(INDEX).toContain(`<use href="#bandeau-texte" class="${couche}"`);
    }
  });
});
