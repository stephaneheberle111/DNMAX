// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { ErreurDirect, lireErreurDirect, lireEtape } from "./canal-direct";

describe("lireErreurDirect", () => {
  it("reprend un code d'erreur connu de l'enveloppe", () => {
    expect(lireErreurDirect("code-errone")).toEqual(new ErreurDirect("code-errone"));
  });

  it("ramène une erreur inconnue à « interne »", () => {
    expect(lireErreurDirect("autre-chose").code).toBe("interne");
    expect(lireErreurDirect(new Error("panne")).code).toBe("interne");
    expect(lireErreurDirect(undefined).code).toBe("interne");
  });
});

describe("lireEtape", () => {
  it("lit le code à dicter et sa validité", () => {
    expect(lireEtape({ etape: "code", code: "4821 7395", validiteSecondes: 300 })).toEqual({
      etape: "code",
      code: "4821 7395",
      validiteSecondes: 300,
    });
  });

  it("refuse un code qui n'a pas la forme de deux groupes de quatre chiffres", () => {
    expect(lireEtape({ etape: "code", code: "<b>1234</b>", validiteSecondes: 300 })).toBeNull();
    expect(lireEtape({ etape: "code", code: "48217395", validiteSecondes: 300 })).toBeNull();
  });

  it("lit l'avancement du transfert", () => {
    expect(lireEtape({ etape: "progression", faits: 10, total: 20 })).toEqual({ etape: "progression", faits: 10, total: 20 });
  });

  it("refuse un avancement incohérent", () => {
    expect(lireEtape({ etape: "progression", faits: 30, total: 20 })).toBeNull();
    expect(lireEtape({ etape: "progression", faits: -1, total: 20 })).toBeNull();
    expect(lireEtape({ etape: "progression", faits: 1.5, total: 20 })).toBeNull();
  });

  it("lit les étapes sans détail", () => {
    expect(lireEtape({ etape: "recherche" })).toEqual({ etape: "recherche" });
    expect(lireEtape({ etape: "connexion", intrus: 1 })).toEqual({ etape: "connexion" });
  });

  it("ignore une étape inconnue ou mal formée", () => {
    expect(lireEtape({ etape: "autre" })).toBeNull();
    expect(lireEtape(null)).toBeNull();
    expect(lireEtape("code")).toBeNull();
  });
});
