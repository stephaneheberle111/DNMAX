// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { attributTheme, estTheme, lireTheme } from "./theme";

describe("lireTheme", () => {
  it("relit un thème enregistré", () => {
    expect(lireTheme("sombre")).toBe("sombre");
    expect(lireTheme("clair")).toBe("clair");
  });

  it("suit l'ordinateur quand rien n'est enregistré", () => {
    expect(lireTheme(null)).toBe("systeme");
    expect(lireTheme("")).toBe("systeme");
  });

  it("suit l'ordinateur pour une valeur inconnue ou d'un autre type", () => {
    expect(lireTheme("dark")).toBe("systeme");
    expect(lireTheme("Sombre")).toBe("systeme");
    expect(lireTheme(1)).toBe("systeme");
  });
});

describe("estTheme", () => {
  it("reconnaît les trois thèmes et eux seuls", () => {
    expect(["clair", "sombre", "systeme"].every(estTheme)).toBe(true);
    expect(estTheme("auto")).toBe(false);
  });
});

describe("attributTheme", () => {
  it("force le clair ou le sombre", () => {
    expect(attributTheme("clair")).toBe("light");
    expect(attributTheme("sombre")).toBe("dark");
  });

  it("retire l'attribut pour suivre l'ordinateur", () => {
    expect(attributTheme("systeme")).toBeNull();
  });
});
