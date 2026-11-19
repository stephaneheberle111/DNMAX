// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { ecouterRedimensionnement, radialWire } from "./radiale-gestes";

describe("radialWire", () => {
  it("ne fait rien quand l'hôte ne contient pas de carte radiale", () => {
    const demandes: string[] = [];
    const hote = { querySelector: (selecteur: string) => (demandes.push(selecteur), null) } as unknown as HTMLElement;
    expect(() => {
      radialWire(hote);
    }).not.toThrow();
    expect(demandes).toEqual(["svg.radial"]);
  });
});

describe("ecouterRedimensionnement", () => {
  it("écoute le redimensionnement de la fenêtre, sans effet tant qu'aucune carte n'est branchée", () => {
    const ecouteurs: [string, () => void][] = [];
    const fenetre = { addEventListener: (type: string, ecouteur: () => void) => ecouteurs.push([type, ecouteur]) } as unknown as Window;
    ecouterRedimensionnement(fenetre);
    expect(ecouteurs.map(([type]) => type)).toEqual(["resize"]);
    expect(() => {
      (ecouteurs[0] as [string, () => void])[1]();
    }).not.toThrow();
  });
});
