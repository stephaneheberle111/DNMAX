// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { couleurNiveau, encreNiveau, positionNiveau } from "./teintes-niveaux";

describe("couleurNiveau", () => {
  it("donne le pétrole pâle au premier niveau et le pétrole foncé au dernier", () => {
    expect(couleurNiveau(0, 4)).toBe("rgb(168 210 212)");
    expect(couleurNiveau(3, 4)).toBe("rgb(16 85 95)");
  });

  it("interpole entre deux teintes repères quand les niveaux ne tombent pas dessus", () => {
    expect(couleurNiveau(1, 3)).toBe("rgb(70 148 155)");
  });

  it("donne au niveau d'une échelle à un seul niveau la teinte la plus foncée", () => {
    expect(couleurNiveau(0, 1)).toBe("rgb(16 85 95)");
  });
});

describe("positionNiveau", () => {
  it("ramène un rang hors de l'échelle à ses bornes", () => {
    expect(positionNiveau(-2, 4)).toBe(0);
    expect(positionNiveau(9, 4)).toBe(1);
  });
});

describe("encreNiveau", () => {
  it("écrit en sombre sur les niveaux clairs et en blanc sur les foncés", () => {
    expect(encreNiveau(1, 4)).toBe("#1C1A15");
    expect(encreNiveau(2, 4)).toBe("#FFFFFF");
  });
});
