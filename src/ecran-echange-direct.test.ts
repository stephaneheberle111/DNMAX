// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { ErreurDirect } from "./canal-direct";
import { messagePourErreurDirect } from "./ecran-echange-direct";

describe("messagePourErreurDirect", () => {
  it("rappelle, quand la connexion échoue, que les deux ordinateurs doivent être sur le même réseau", () => {
    const message = messagePourErreurDirect(new ErreurDirect("connexion-impossible"));
    expect(message).toContain("même réseau");
    expect(message).toContain("même wifi");
  });

  it("signale, quand la connexion échoue, les réseaux d'établissement qui isolent les postes", () => {
    expect(messagePourErreurDirect(new ErreurDirect("connexion-impossible"))).toContain("isolent les postes");
  });

  it("propose l'échange par fichier quand la connexion échoue", () => {
    expect(messagePourErreurDirect(new ErreurDirect("connexion-impossible"))).toContain("L'échange par fichier reste disponible");
  });

  it("ne parle pas de réseau quand l'enseignant a simplement annulé", () => {
    expect(messagePourErreurDirect(new ErreurDirect("annule"))).toBe("Échange annulé.");
  });
});
