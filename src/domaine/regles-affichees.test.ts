// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { reglesAffichees, zonesDeLaJauge } from "./regles-affichees";

describe("règles affichées", () => {
  it("décrit les zones de la jauge à partir des seuils appliqués", () => {
    expect(zonesDeLaJauge()).toEqual([
      "Insuffisant de 0 % à 15 %",
      "Fragile de 15 % à 50 %",
      "Satisfaisant de 50 % à 85 %",
      "Très bonne maîtrise de 85 % à 100 %",
    ]);
  });

  it("nomme le niveau à partir duquel une compétence est acquise", () => {
    const acquise = reglesAffichees().find((regle) => regle.titre === "Compétence acquise");
    expect(acquise?.texte).toContain("« Satisfaisant » ou mieux");
  });

  it("ne justifie pas les seuils, et n'a pas de règle sans texte", () => {
    const regles = reglesAffichees();
    expect(regles.find((regle) => regle.titre === "Seuils de la jauge")?.texte).not.toMatch(/pour|afin/);
    expect(regles.every((regle) => regle.texte.trim() !== "")).toBe(true);
  });
});
