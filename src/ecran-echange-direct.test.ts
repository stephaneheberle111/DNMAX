// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { ErreurDirect } from "./canal-direct";
import { messagePourErreurDirect, messagePourSaisie } from "./ecran-echange-direct";

describe("messagePourErreurDirect", () => {
  it("rappelle, quand l'expéditeur est introuvable, que les deux ordinateurs doivent être sur le même réseau", () => {
    const message = messagePourErreurDirect(new ErreurDirect("expediteur-introuvable"));
    expect(message).toContain("même réseau");
    expect(message).toContain("même wifi");
  });

  it("signale les réseaux d'établissement qui isolent les postes", () => {
    expect(messagePourErreurDirect(new ErreurDirect("expediteur-introuvable"))).toContain("isolent");
    expect(messagePourErreurDirect(new ErreurDirect("connexion-impossible"))).toContain("isole");
  });

  it("propose l'échange par fichier quand le réseau fait échouer l'échange", () => {
    for (const code of ["expediteur-introuvable", "connexion-impossible", "delai-depasse", "reseau-indisponible"] as const) {
      expect(messagePourErreurDirect(new ErreurDirect(code))).toContain("L'échange par fichier reste disponible");
    }
  });

  it("demande un nouveau code au destinataire dont le code est erroné", () => {
    const message = messagePourErreurDirect(new ErreurDirect("code-errone"));
    expect(message).toContain("ne correspond pas");
    expect(message).toContain("nouveau code");
  });

  it("prévient l'expéditeur qu'une tentative avec un mauvais code a annulé son code", () => {
    expect(messagePourErreurDirect(new ErreurDirect("code-errone"), "envoi")).toContain("code erroné");
  });

  it("dit à l'expéditeur que le code a expiré", () => {
    expect(messagePourErreurDirect(new ErreurDirect("delai-depasse"), "envoi")).toContain("expiré");
  });

  it("ne parle pas de réseau quand l'enseignant a simplement annulé", () => {
    expect(messagePourErreurDirect(new ErreurDirect("annule"))).toBe("Échange annulé.");
  });
});

describe("messagePourSaisie", () => {
  it("rappelle que le code compte 8 chiffres", () => {
    expect(messagePourSaisie("trop-court")).toContain("8");
    expect(messagePourSaisie("trop-long")).toContain("8");
  });
});
