// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { dispositionLibellesNiveaux, largeurMinimaleLibelle, largeursLibellesNiveaux } from "./jauge-export";
import { bornesNiveaux } from "./saisie-resultats";

const NIVEAUX = ["Non acquis", "En cours d'acquisition", "Acquis", "Maîtrisé"];
/** Largeur de la jauge d'une colonne « Niveau de maîtrise » d'un export Word A4, en twips. */
const JAUGE = 2638;
const TAILLE = 7;

describe("dispositionLibellesNiveaux", () => {
  const { taille, largeurs } = dispositionLibellesNiveaux(NIVEAUX, bornesNiveaux(NIVEAUX.length), JAUGE);

  it("donne à chaque libellé la place de son mot le plus long, pour qu'aucun mot ne soit coupé", () => {
    largeurs.forEach((largeur, rang) => {
      expect(largeur).toBeGreaterThanOrEqual(largeurMinimaleLibelle(NIVEAUX[rang] ?? "", taille));
    });
  });

  it("garde la largeur totale de la jauge", () => {
    expect(largeurs.reduce((total, largeur) => total + largeur, 0)).toBe(JAUGE);
  });

  it("réduit le texte quand les libellés ne tiennent pas tous à la taille habituelle", () => {
    expect(taille).toBeLessThan(TAILLE);
  });

  it("garde la taille habituelle quand la jauge est assez large", () => {
    expect(dispositionLibellesNiveaux(NIVEAUX, bornesNiveaux(NIVEAUX.length), 6000).taille).toBe(TAILLE);
  });

  it("descend à la plus petite taille, sans aller plus bas, pour une jauge très étroite", () => {
    expect(dispositionLibellesNiveaux(NIVEAUX, bornesNiveaux(NIVEAUX.length), 500).taille).toBe(6);
  });
});

describe("largeursLibellesNiveaux", () => {
  it("suit les zones de la jauge quand tous les libellés y tiennent", () => {
    expect(largeursLibellesNiveaux([0, 50, 100], 2000, [100, 100])).toEqual([1000, 1000]);
  });

  it("prend la place sur les zones larges, au prorata, sans les faire passer sous leur minimum", () => {
    expect(largeursLibellesNiveaux([0, 10, 100], 1000, [300, 100])).toEqual([300, 700]);
  });

  it("partage la largeur au prorata des minimums quand la jauge est trop étroite pour tous", () => {
    expect(largeursLibellesNiveaux([0, 50, 100], 300, [200, 400])).toEqual([100, 200]);
  });

  it("ne rend rien sans niveau", () => {
    expect(largeursLibellesNiveaux([0, 100], 1000, [])).toEqual([]);
  });
});

describe("largeurMinimaleLibelle", () => {
  it("dépend du mot le plus long, pas de la longueur du libellé", () => {
    expect(largeurMinimaleLibelle("En cours d'acquisition", TAILLE)).toBe(largeurMinimaleLibelle("d'acquisition", TAILLE));
  });

  it("grandit avec la taille du texte", () => {
    expect(largeurMinimaleLibelle("Acquis", 9)).toBeGreaterThan(largeurMinimaleLibelle("Acquis", 7));
  });
});
