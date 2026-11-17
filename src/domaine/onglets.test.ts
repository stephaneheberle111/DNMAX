// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { pageAffichee, pageDuBouton, titreFenetre } from "./onglets";

describe("pageAffichee", () => {
  it("garde une page connue", () => {
    expect(pageAffichee("prog")).toBe("prog");
    expect(pageAffichee("pref")).toBe("pref");
  });

  it("revient à la liste pour une page inconnue ou absente", () => {
    expect(pageAffichee("inconnue")).toBe("saved");
    expect(pageAffichee(undefined)).toBe("saved");
  });
});

describe("pageDuBouton", () => {
  it("ouvre la liste depuis « Mes évaluations »", () => {
    expect(pageDuBouton("t-saved")).toBe("saved");
  });

  it("ouvre la page nommée par le bouton", () => {
    expect(pageDuBouton("t-org")).toBe("org");
  });
});

describe("titreFenetre", () => {
  it("nomme la page affichée après le nom de l'application", () => {
    expect(titreFenetre("org")).toBe("DNMAX · Mon établissement");
  });

  it("donne le même titre aux deux vues de « Mes évaluations »", () => {
    expect(titreFenetre("new")).toBe(titreFenetre("saved"));
  });
});
