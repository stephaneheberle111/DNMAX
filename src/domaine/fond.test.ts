// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { FOND_PAR_DEFAUT, attributsFond, lireFond } from "./fond";

describe("lireFond", () => {
  it("relit un fond enregistré", () => {
    expect(lireFond(JSON.stringify({ trame: "verge", force: "peine", xEnCreux: false }))).toEqual({
      trame: "verge",
      force: "peine",
      xEnCreux: false,
    });
  });

  it("donne le feutre, en force normale, avec le X en creux, quand rien n'est enregistré", () => {
    expect(lireFond(null)).toEqual({ trame: "feutre", force: "normale", xEnCreux: true });
    expect(lireFond(undefined)).toBe(FOND_PAR_DEFAUT);
  });

  it("donne le fond par défaut pour un texte illisible ou qui n'est pas un objet", () => {
    expect(lireFond("{pas du json")).toBe(FOND_PAR_DEFAUT);
    expect(lireFond("null")).toBe(FOND_PAR_DEFAUT);
    expect(lireFond('"feutre"')).toBe(FOND_PAR_DEFAUT);
  });

  it("remplace chaque champ inconnu par sa valeur par défaut sans perdre les autres", () => {
    expect(lireFond(JSON.stringify({ trame: "marbre", force: "peine", xEnCreux: "oui" }))).toEqual({
      trame: "feutre",
      force: "peine",
      xEnCreux: true,
    });
  });
});

describe("attributsFond", () => {
  it("traduit le fond en attributs de page", () => {
    expect(attributsFond({ trame: "toile", force: "peine", xEnCreux: false })).toEqual({
      "data-fond": "toile",
      "data-relief": "peine",
      "data-x-creux": "non",
    });
  });

  it("marque le X en creux affiché par « oui »", () => {
    expect(attributsFond(FOND_PAR_DEFAUT)["data-x-creux"]).toBe("oui");
  });
});
