// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { aideMiseAJour, classerLien, indicationMiseAJour, rechercheAutomatiqueDue } from "./pied-de-page";

describe("indicationMiseAJour", () => {
  it("ne dit rien tant qu'aucune recherche n'a été lancée", () => {
    expect(indicationMiseAJour("inconnu")).toBe("");
  });

  it("dit si DNMAX est à jour, ou qu'une nouvelle version est disponible", () => {
    expect(indicationMiseAJour("a-jour")).toBe("à jour");
    expect(indicationMiseAJour("disponible")).toBe("nouvelle version disponible");
  });

  it("signale une vérification qui n'a pas abouti", () => {
    expect(indicationMiseAJour("impossible")).toBe("vérification impossible");
  });
});

describe("aideMiseAJour", () => {
  it("rappelle que la recherche ne transmet aucune donnée", () => {
    expect(aideMiseAJour("inconnu")).toContain("sans rien transmettre de vos données");
  });
});

describe("classerLien", () => {
  it("garde dans l'application le renvoi à une autre rubrique", () => {
    expect(classerLien("#documentation", "rgpd-eleves")).toEqual({ type: "rubrique", rubrique: "rgpd-eleves" });
  });

  it("ouvre la page Confidentialité de l'application", () => {
    expect(classerLien("#confidentialite", undefined)).toEqual({ type: "confidentialite" });
  });

  it("ouvre à part une adresse web sécurisée ou un courriel", () => {
    expect(classerLien("https://www.cnil.fr/fr/plaintes", undefined)).toEqual({ type: "externe", adresse: "https://www.cnil.fr/fr/plaintes" });
    expect(classerLien("mailto:contact@dnmax.fr", undefined)).toEqual({ type: "externe", adresse: "mailto:contact@dnmax.fr" });
  });

  it("neutralise les ancres du site, les adresses non sécurisées et les liens vides", () => {
    expect(classerLien("#", undefined)).toEqual({ type: "inerte" });
    expect(classerLien("http://exemple.fr", undefined)).toEqual({ type: "inerte" });
    expect(classerLien("javascript:alert(1)", undefined)).toEqual({ type: "inerte" });
  });
});

describe("rechercheAutomatiqueDue", () => {
  it("part une fois par jour quand elle est activée", () => {
    expect(rechercheAutomatiqueDue(true, "2026-11-15", "2026-11-16")).toBe(true);
    expect(rechercheAutomatiqueDue(true, "", "2026-11-16")).toBe(true);
  });

  it("ne part pas deux fois le même jour, ni si elle est désactivée", () => {
    expect(rechercheAutomatiqueDue(true, "2026-11-16", "2026-11-16")).toBe(false);
    expect(rechercheAutomatiqueDue(false, "", "2026-11-16")).toBe(false);
  });
});
