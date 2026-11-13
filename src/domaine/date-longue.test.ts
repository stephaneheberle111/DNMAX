// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { ecrireDateLongue } from "./date-longue";

describe("ecrireDateLongue", () => {
  it("écrit le jour, le mois en toutes lettres et l'année", () => {
    expect(ecrireDateLongue(new Date(2026, 10, 13))).toBe("13 novembre 2026");
  });

  it("écrit « 1er » pour le premier du mois", () => {
    expect(ecrireDateLongue(new Date(2027, 2, 1))).toBe("1er mars 2027");
  });

  it("garde les accents des mois", () => {
    expect(ecrireDateLongue(new Date(2026, 1, 2))).toBe("2 février 2026");
    expect(ecrireDateLongue(new Date(2026, 7, 15))).toBe("15 août 2026");
    expect(ecrireDateLongue(new Date(2026, 11, 31))).toBe("31 décembre 2026");
  });

  it("ignore l'heure de la journée", () => {
    expect(ecrireDateLongue(new Date(2026, 10, 13, 23, 59, 59))).toBe("13 novembre 2026");
  });

  it("rend une chaîne vide pour une date invalide", () => {
    expect(ecrireDateLongue(new Date(Number.NaN))).toBe("");
  });
});
