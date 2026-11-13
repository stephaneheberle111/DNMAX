// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  bornerVue,
  bornerZoom,
  facteurMolette,
  hauteurCadre,
  libellesVisibles,
  pasAnimation,
  tailleVue,
  vueDepart,
  zoomerAutour,
  type GeometrieCarte,
} from "./zoom-carte";

/** Géométrie de la carte radiale : dessin de 960 unités, roue centrée en 380. */
const GEOMETRIE: GeometrieCarte = {
  cote: 960,
  origine: -100,
  centreRoue: 380,
  rayonCoeur: 98,
  zoomMin: 1,
  zoomMax: 2.5,
  zoomDepart: 1.65,
};

describe("bornerZoom", () => {
  it("garde un zoom compris dans les bornes", () => {
    expect(bornerZoom(1.3, 1, 2.5)).toBe(1.3);
  });
  it("ramène un zoom trop fort au maximum", () => {
    expect(bornerZoom(9, 1, 2.5)).toBe(2.5);
  });
  it("vaut le minimum pour une valeur non finie", () => {
    expect(bornerZoom(Number.NaN, 1, 2.5)).toBe(1);
  });
});

describe("facteurMolette", () => {
  it("grossit d'environ 8 % pour un cran de souris vers l'avant", () => {
    expect(facteurMolette(-100, 0, false)).toBeCloseTo(Math.exp(0.08), 6);
  });
  it("réduit pour un cran vers l'arrière, symétriquement", () => {
    expect(facteurMolette(100, 0, false) * facteurMolette(-100, 0, false)).toBeCloseTo(1, 9);
  });
  it("vaut 1 sans déplacement", () => {
    expect(facteurMolette(0, 0, false)).toBe(1);
  });
  it("compte les lignes comme seize pixels", () => {
    expect(facteurMolette(-3, 1, false)).toBeCloseTo(facteurMolette(-48, 0, false), 9);
  });
  it("borne un évènement démesuré (défilement par page)", () => {
    expect(facteurMolette(-5, 2, false)).toBeCloseTo(Math.exp(0.4), 9);
  });
  it("réagit plus fort au pincement d'un pavé tactile", () => {
    expect(facteurMolette(-5, 0, true)).toBeGreaterThan(facteurMolette(-5, 0, false));
  });
});

describe("tailleVue", () => {
  it("suit le rapport du cadre pour la largeur", () => {
    expect(tailleVue(2, 960, 1.25)).toEqual({ largeur: 600, hauteur: 480 });
  });
  it("traite un rapport nul comme un cadre carré", () => {
    expect(tailleVue(1, 960, 0)).toEqual({ largeur: 960, hauteur: 960 });
  });
});

describe("vueDepart", () => {
  it("place le cœur de la roue en haut à gauche au zoom de départ", () => {
    const vue = vueDepart(1.3, GEOMETRIE);
    const { largeur, hauteur } = tailleVue(vue.zoom, GEOMETRIE.cote, 1.3);
    expect(vue.zoom).toBe(1.65);
    expect(vue.centreX - largeur / 2).toBeCloseTo(282, 6);
    expect(vue.centreY - hauteur / 2).toBeCloseTo(282, 6);
  });
  it("centre la roue entière au zoom 1", () => {
    expect(vueDepart(1, GEOMETRIE, 1)).toEqual({ zoom: 1, centreX: 380, centreY: 380 });
  });
});

describe("bornerVue", () => {
  it("montre tout le dessin au zoom 1, même si l'on vise un bord", () => {
    const vue = bornerVue({ zoom: 1, centreX: 900, centreY: -400 }, 1, GEOMETRIE);
    expect(vue).toEqual({ zoom: 1, centreX: 380, centreY: 380 });
  });
  it("garde la vue dans le dessin quand on zoome fort vers son bord", () => {
    const vue = bornerVue({ zoom: 2.5, centreX: 5000, centreY: 5000 }, 1.25, GEOMETRIE);
    const { largeur, hauteur } = tailleVue(2.5, GEOMETRIE.cote, 1.25);
    expect(vue.centreX + largeur / 2).toBeCloseTo(860, 9);
    expect(vue.centreY + hauteur / 2).toBeCloseTo(860, 9);
  });
  it("laisse glisser la vue jusqu'au cœur de la roue, pas au-delà, au zoom de départ", () => {
    const vue = bornerVue({ zoom: 1.65, centreX: 5000, centreY: 5000 }, 1.3, GEOMETRIE);
    const { largeur } = tailleVue(1.65, GEOMETRIE.cote, 1.3);
    expect(vue.centreX - largeur / 2).toBeCloseTo(282, 9);
  });
  it("élargit la plage sans saut entre le zoom 1 et le zoom de départ", () => {
    const loin = { centreX: 5000, centreY: 5000 };
    const juste = bornerVue({ zoom: 1.3, ...loin }, 1.25, GEOMETRIE);
    const apres = bornerVue({ zoom: 1.3001, ...loin }, 1.25, GEOMETRIE);
    expect(Math.abs(apres.centreX - juste.centreX)).toBeLessThan(0.5);
  });
});

describe("zoomerAutour", () => {
  it("garde immobile le point visé", () => {
    const depart = { zoom: 1.5, centreX: 400, centreY: 400 };
    const rapport = 1.25;
    const vue = zoomerAutour(depart, 1.2, 450, 420, rapport, GEOMETRIE);
    const avant = tailleVue(depart.zoom, GEOMETRIE.cote, rapport);
    const apres = tailleVue(vue.zoom, GEOMETRIE.cote, rapport);
    // position relative du point dans la vue, avant et après
    const relatifAvant = (450 - (depart.centreX - avant.largeur / 2)) / avant.largeur;
    const relatifApres = (450 - (vue.centreX - apres.largeur / 2)) / apres.largeur;
    expect(relatifApres).toBeCloseTo(relatifAvant, 9);
  });
  it("ne dépasse pas le zoom maximal", () => {
    expect(zoomerAutour({ zoom: 2.4, centreX: 380, centreY: 380 }, 3, 380, 380, 1, GEOMETRIE).zoom).toBe(2.5);
  });
  it("ignore un facteur invalide", () => {
    const vue = { zoom: 1.65, centreX: 600, centreY: 520 };
    expect(zoomerAutour(vue, Number.NaN, 0, 0, 1.25, GEOMETRIE).zoom).toBe(1.65);
  });
});

describe("pasAnimation", () => {
  const depart = { zoom: 1, centreX: 380, centreY: 380 };
  const cible = { zoom: 2, centreX: 480, centreY: 420 };
  it("couvre la moitié de l'écart en une demi-vie", () => {
    expect(pasAnimation(depart, cible, 80, 80).zoom).toBeCloseTo(1.5, 9);
  });
  it("saute à la cible quand les mouvements sont réduits", () => {
    expect(pasAnimation(depart, cible, 16, 0)).toBe(cible);
  });
  it("rend la cible quand l'écart restant est imperceptible", () => {
    const presque = { zoom: 1.99999, centreX: 479.99, centreY: 420.01 };
    expect(pasAnimation(presque, cible, 16, 80)).toBe(cible);
  });
});

describe("libellesVisibles", () => {
  const tailles = { ue: 10, an: 10.5, ec: 9 };
  it("montre tous les libellés quand le dessin est rendu assez grand", () => {
    expect(libellesVisibles(1, tailles)).toEqual({ ue: true, an: true, ec: true });
  });
  it("masque les plus petits libellés d'abord", () => {
    expect(libellesVisibles(0.6, tailles)).toEqual({ ue: true, an: true, ec: false });
  });
  it("masque tout pour une échelle nulle", () => {
    expect(libellesVisibles(0, tailles)).toEqual({ ue: false, an: false, ec: false });
  });
});

describe("hauteurCadre", () => {
  it("tient dans la fenêtre d'un écran de 1280 × 800", () => {
    expect(hauteurCadre(900, 800)).toBe(690);
  });
  it("plafonne sur un grand écran de 2560 × 1440", () => {
    expect(hauteurCadre(1500, 1440)).toBe(940);
  });
  it("reste plus large que haut (5:4) dans une colonne moyenne", () => {
    expect(hauteurCadre(700, 1440)).toBe(560);
  });
  it("accepte un plafond plus haut pour les très grands écrans", () => {
    expect(hauteurCadre(1500, 1440, 1120)).toBe(1120);
  });
  it("devient carré sur un téléphone", () => {
    expect(hauteurCadre(325, 812)).toBe(325);
  });
  it("vaut zéro pour une largeur inconnue", () => {
    expect(hauteurCadre(0, 800)).toBe(0);
  });
});
