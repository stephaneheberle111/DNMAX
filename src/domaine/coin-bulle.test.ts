// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { choisirCoin } from "./coin-bulle";

const bulle = { width: 300, height: 200 };
const fenetre = { width: 1280, height: 800, piedPage: 40 };

describe("choisirCoin", () => {
  it("range la bulle en bas à droite quand rien n'est à éviter", () => {
    expect(choisirCoin(bulle, fenetre, [], 12)).toEqual({ gauche: 968, haut: 548 });
  });

  it("passe en bas à gauche quand le bouton à cliquer est en bas à droite", () => {
    const bouton = { left: 1100, top: 700, width: 150, height: 40 };
    expect(choisirCoin(bulle, fenetre, [bouton], 12)).toEqual({ gauche: 12, haut: 548 });
  });

  it("monte en haut quand toute la largeur du bas est occupée", () => {
    const barre = { left: 0, top: 600, width: 1280, height: 150 };
    expect(choisirCoin(bulle, fenetre, [barre], 12)).toEqual({ gauche: 968, haut: 12 });
  });

  it("dégage tous les boutons à la fois", () => {
    const valider = { left: 1100, top: 700, width: 150, height: 40 };
    const caseACocher = { left: 20, top: 700, width: 150, height: 40 };
    expect(choisirCoin(bulle, fenetre, [valider, caseACocher], 12)).toEqual({ gauche: 968, haut: 12 });
  });

  it("garde le coin qui cache le moins quand tous recouvrent la zone", () => {
    const presqueTout = { left: 0, top: 0, width: 1200, height: 760 };
    expect(choisirCoin(bulle, fenetre, [presqueTout], 12)).toEqual({ gauche: 968, haut: 548 });
  });
});
