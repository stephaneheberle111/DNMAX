// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { libelleCritere, preferencesInitiales, sceauActif } from "./preferences";

describe("preferencesInitiales", () => {
  it("propose « Compétence opérationnelle » au premier lancement", () => {
    expect(libelleCritere(preferencesInitiales({}))).toBe("Compétence opérationnelle");
  });

  it("garde les préférences enregistrées", () => {
    expect(preferencesInitiales({ critLabel: "Attendu", sceau: true })).toEqual({ critLabel: "Attendu", sceau: true });
  });
});

describe("libelleCritere", () => {
  it("rend le nom choisi sans espaces autour", () => {
    expect(libelleCritere({ critLabel: "  Indicateur  " })).toBe("Indicateur");
  });

  it("revient au nom par défaut quand le nom est vide ou fait d'espaces", () => {
    expect(libelleCritere({ critLabel: "" })).toBe("Compétence opérationnelle");
    expect(libelleCritere({ critLabel: "   " })).toBe("Compétence opérationnelle");
  });

  it("ignore un nom enregistré qui n'est pas du texte", () => {
    expect(libelleCritere({ critLabel: 42 })).toBe("Compétence opérationnelle");
  });
});

describe("sceauActif", () => {
  it("n'affiche le sceau que s'il est demandé", () => {
    expect(sceauActif({ sceau: true })).toBe(true);
    expect(sceauActif({})).toBe(false);
    expect(sceauActif({ sceau: "oui" })).toBe(false);
  });
});
