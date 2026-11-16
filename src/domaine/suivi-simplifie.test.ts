// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { actionSimplifiee, statutSimplifie } from "./suivi-simplifie";

describe("statutSimplifie", () => {
  it("met « À faire » tant que la fiche n'est pas distribuée, « Faite » ensuite", () => {
    expect(statutSimplifie("prep")).toBe("a-faire");
    for (const statut of ["distrib", "rendu", "evalcours", "eval", "restpart", "restit"]) {
      expect(statutSimplifie(statut)).toBe("faite");
    }
  });

  it("garde Brouillon et Annulée", () => {
    expect(statutSimplifie("brouillon")).toBe("brouillon");
    expect(statutSimplifie("annulee")).toBe("annulee");
  });
});

describe("actionSimplifiee", () => {
  it("propose de marquer faite une fiche préparée, et de la remettre à faire juste après", () => {
    expect(actionSimplifiee("prep")).toBe("marquer-faite");
    expect(actionSimplifiee("distrib")).toBe("remettre-a-faire");
  });

  it("ne propose rien une fois l'évaluation allée plus loin", () => {
    expect(actionSimplifiee("eval")).toBeNull();
    expect(actionSimplifiee("brouillon")).toBeNull();
  });
});
