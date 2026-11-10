// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { composerLibelleVersion } from "./libelle-version";

describe("composerLibelleVersion", () => {
  it("accole la version au nom quand elle est bien formée", () => {
    expect(composerLibelleVersion("DNMAX", "1.4.0")).toBe("DNMAX 1.4.0");
  });

  it("accepte un suffixe de préversion", () => {
    expect(composerLibelleVersion("DNMAX", "1.4.0-beta.2")).toBe("DNMAX 1.4.0-beta.2");
  });

  it("ignore les espaces autour de la version", () => {
    expect(composerLibelleVersion("DNMAX", " 1.4.0\n")).toBe("DNMAX 1.4.0");
  });

  it("rend le nom seul quand la version est absente", () => {
    expect(composerLibelleVersion("DNMAX", null)).toBe("DNMAX");
  });

  it("rend le nom seul quand la version est vide", () => {
    expect(composerLibelleVersion("DNMAX", "")).toBe("DNMAX");
  });

  it("rend le nom seul quand la version est mal formée", () => {
    expect(composerLibelleVersion("DNMAX", "<b>1.4</b>")).toBe("DNMAX");
  });
});
