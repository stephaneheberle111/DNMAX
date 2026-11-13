// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Zoom de la carte radiale du référentiel : calculs seuls, sans accès au
 * document. L'interface historique les appelle par `window.dnmaxPont.zoomCarte`.
 *
 * Toutes les longueurs sont en unités du dessin (le `viewBox` du SVG), sauf
 * mention contraire. Une « vue » est le rectangle du dessin montré dans le cadre :
 * son centre et son grossissement ; sa largeur suit le rapport largeur / hauteur
 * du cadre, pour qu'aucune bande vide ne s'ajoute autour du dessin.
 */

/** Rectangle du dessin montré dans le cadre. */
export interface VueCarte {
  /** Grossissement : 1 montre tout le dessin dans la hauteur du cadre. */
  readonly zoom: number;
  readonly centreX: number;
  readonly centreY: number;
}

/** Géométrie fixe du dessin et réglages du zoom. */
export interface GeometrieCarte {
  /** Côté du dessin entier (roue et marge), montré en entier au zoom 1. */
  readonly cote: number;
  /** Abscisse et ordonnée du bord haut-gauche du dessin entier. */
  readonly origine: number;
  /** Centre de la roue (même valeur en abscisse et en ordonnée). */
  readonly centreRoue: number;
  /** Rayon autour du centre de la roue qui reste visible dès le zoom de départ. */
  readonly rayonCoeur: number;
  readonly zoomMin: number;
  readonly zoomMax: number;
  /** Zoom de départ, où le quart bas-droit de la roue remplit la vue. */
  readonly zoomDepart: number;
}

/** Grossissement borné ; une valeur absente ou non finie vaut le minimum. */
export function bornerZoom(zoom: number, min: number, max: number): number {
  if (!Number.isFinite(zoom)) return min;
  return Math.min(max, Math.max(min, zoom));
}

/** Pixels représentés par un cran de molette selon le mode du navigateur (ligne, page). */
const PIXELS_PAR_LIGNE = 16;
const PIXELS_PAR_PAGE = 400;
/** Un cran de souris (~100 px) grossit d'environ 8 % : assez fin pour être progressif. */
const SENSIBILITE_MOLETTE = 0.0008;
/** Pincement sur pavé tactile (molette avec Ctrl) : petits écarts, d'où une sensibilité plus forte. */
const SENSIBILITE_PINCEMENT = 0.01;
/**
 * Un seul évènement ne fait jamais varier le zoom de plus d'environ 50 % (défilement par page).
 * Pas moins : le navigateur fusionne les crans d'une molette rapide en un seul évènement.
 */
const ECART_MAX_PAR_EVENEMENT = 0.4;

/**
 * Facteur multiplicatif de zoom pour un évènement de molette : supérieur à 1
 * quand on pousse la molette vers l'avant (`deltaY` négatif).
 *
 * @param modeDelta `WheelEvent.deltaMode` : 0 pixels, 1 lignes, 2 pages
 * @param pincement vrai quand la touche Ctrl accompagne l'évènement (geste de pincement d'un pavé tactile)
 */
export function facteurMolette(deltaY: number, modeDelta: number, pincement: boolean): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 1;
  const pixels = deltaY * (modeDelta === 1 ? PIXELS_PAR_LIGNE : modeDelta === 2 ? PIXELS_PAR_PAGE : 1);
  const exposant = -pixels * (pincement ? SENSIBILITE_PINCEMENT : SENSIBILITE_MOLETTE);
  const borne = Math.max(-ECART_MAX_PAR_EVENEMENT, Math.min(ECART_MAX_PAR_EVENEMENT, exposant));
  return Math.exp(borne);
}

/** Largeur et hauteur de la vue, en unités du dessin. */
export function tailleVue(zoom: number, cote: number, rapport: number): { largeur: number; hauteur: number } {
  const hauteur = cote / zoom;
  const largeurUtile = Number.isFinite(rapport) && rapport > 0 ? rapport : 1;
  return { largeur: hauteur * largeurUtile, hauteur };
}

/**
 * Plage permise pour le bord bas (gauche ou haut) de la vue, sur un axe.
 * Au zoom 1, tout le dessin reste visible. Plus près, la vue reste dans le
 * dessin ; à partir du zoom de départ, elle peut en outre glisser vers le vide à
 * droite et en bas (la place des compétences éclatées) jusqu'à avoir le cœur de
 * la roue dans son coin haut-gauche, pas au-delà. Entre le zoom 1 et le zoom de
 * départ, la plage s'élargit progressivement : aucun saut quand on traverse un seuil.
 */
function plageAxe(taille: number, zoom: number, geometrie: GeometrieCarte): [number, number] {
  const debut = geometrie.origine;
  const fin = geometrie.origine + geometrie.cote;
  const bas = Math.min(debut, fin - taille);
  const hautStrict = Math.max(debut, fin - taille);
  const hautCoeur = Math.max(hautStrict, geometrie.centreRoue - geometrie.rayonCoeur);
  const ouverture =
    geometrie.zoomDepart > geometrie.zoomMin
      ? Math.min(1, Math.max(0, (zoom - geometrie.zoomMin) / (geometrie.zoomDepart - geometrie.zoomMin)))
      : 1;
  return [bas, hautStrict + (hautCoeur - hautStrict) * ouverture];
}

/** Vue ramenée dans les bornes : zoom permis, dessin jamais perdu de vue. */
export function bornerVue(vue: VueCarte, rapport: number, geometrie: GeometrieCarte): VueCarte {
  const zoom = bornerZoom(vue.zoom, geometrie.zoomMin, geometrie.zoomMax);
  const { largeur, hauteur } = tailleVue(zoom, geometrie.cote, rapport);
  const [basX, hautX] = plageAxe(largeur, zoom, geometrie);
  const [basY, hautY] = plageAxe(hauteur, zoom, geometrie);
  const centreX = Number.isFinite(vue.centreX) ? vue.centreX : geometrie.centreRoue;
  const centreY = Number.isFinite(vue.centreY) ? vue.centreY : geometrie.centreRoue;
  const gaucheX = Math.min(hautX, Math.max(basX, centreX - largeur / 2));
  const hautVueY = Math.min(hautY, Math.max(basY, centreY - hauteur / 2));
  return { zoom, centreX: gaucheX + largeur / 2, centreY: hautVueY + hauteur / 2 };
}

/**
 * Vue de départ : au zoom de départ, le cœur de la roue en haut à gauche et son
 * quart bas-droit qui remplit la vue ; au zoom 1 (téléphone, cadre étroit), la roue entière, centrée.
 */
export function vueDepart(rapport: number, geometrie: GeometrieCarte, zoom: number = geometrie.zoomDepart): VueCarte {
  const z = bornerZoom(zoom, geometrie.zoomMin, geometrie.zoomMax);
  const { largeur, hauteur } = tailleVue(z, geometrie.cote, rapport);
  if (z <= geometrie.zoomMin) {
    return bornerVue({ zoom: z, centreX: geometrie.centreRoue, centreY: geometrie.centreRoue }, rapport, geometrie);
  }
  const coin = geometrie.centreRoue - geometrie.rayonCoeur;
  const t = Math.min(1, (z - geometrie.zoomMin) / Math.max(1e-9, geometrie.zoomDepart - geometrie.zoomMin));
  const gauche = geometrie.origine + t * (coin - geometrie.origine);
  return bornerVue({ zoom: z, centreX: gauche + largeur / 2, centreY: gauche + hauteur / 2 }, rapport, geometrie);
}

/**
 * Nouvelle vue après un changement de zoom qui garde immobile, à l'écran, le
 * point du dessin `(pointX, pointY)` (le pointeur, ou le centre de la vue pour
 * les boutons). Le résultat est borné.
 */
export function zoomerAutour(
  vue: VueCarte,
  facteur: number,
  pointX: number,
  pointY: number,
  rapport: number,
  geometrie: GeometrieCarte,
): VueCarte {
  const zoom = bornerZoom(vue.zoom * (Number.isFinite(facteur) && facteur > 0 ? facteur : 1), geometrie.zoomMin, geometrie.zoomMax);
  const echelle = vue.zoom / zoom;
  return bornerVue(
    {
      zoom,
      centreX: pointX + (vue.centreX - pointX) * echelle,
      centreY: pointY + (vue.centreY - pointY) * echelle,
    },
    rapport,
    geometrie,
  );
}

/**
 * Un pas d'animation douce de la vue vers sa cible : rapprochement exponentiel,
 * indépendant de la cadence d'affichage. Rend la cible quand l'écart est imperceptible.
 *
 * @param dureeMs temps écoulé depuis le pas précédent
 * @param demiVieMs temps pour couvrir la moitié de l'écart restant ; 0 = saut immédiat (mouvements réduits)
 */
export function pasAnimation(courante: VueCarte, cible: VueCarte, dureeMs: number, demiVieMs: number): VueCarte {
  if (demiVieMs <= 0 || !Number.isFinite(dureeMs)) return cible;
  const part = 1 - Math.pow(0.5, Math.max(0, dureeMs) / demiVieMs);
  const suivante = {
    zoom: courante.zoom + (cible.zoom - courante.zoom) * part,
    centreX: courante.centreX + (cible.centreX - courante.centreX) * part,
    centreY: courante.centreY + (cible.centreY - courante.centreY) * part,
  };
  const proche =
    Math.abs(suivante.zoom - cible.zoom) < 1e-3 * cible.zoom &&
    Math.abs(suivante.centreX - cible.centreX) < 0.25 &&
    Math.abs(suivante.centreY - cible.centreY) < 0.25;
  return proche ? cible : suivante;
}

/** Taille à l'écran sous laquelle un libellé n'est plus lisible et brouille la carte, en pixels CSS. */
export const TAILLE_LISIBLE_PX = 5.5;

/**
 * Familles de libellés à afficher, selon la taille à laquelle le dessin est
 * rendu : un libellé trop petit pour être lu est masqué plutôt que de former
 * une bouillie de texte (l'encadré d'information reste disponible au survol).
 *
 * @param pixelsParUnite pixels CSS occupés par une unité du dessin
 * @param tailles taille de police, en unités du dessin, de chaque famille
 */
export function libellesVisibles(
  pixelsParUnite: number,
  tailles: Readonly<Record<string, number>>,
  seuilPx: number = TAILLE_LISIBLE_PX,
): Record<string, boolean> {
  const echelle = Number.isFinite(pixelsParUnite) && pixelsParUnite > 0 ? pixelsParUnite : 0;
  return Object.fromEntries(Object.entries(tailles).map(([famille, taille]) => [famille, taille * echelle >= seuilPx]));
}

/** Hauteur maximale habituelle du cadre, en pixels CSS : au-delà, la carte ne gagne plus en lisibilité. */
const HAUTEUR_CADRE_MAX = 940;
/** Place laissée au-dessus du cadre dans la fenêtre (en-tête et onglets), en pixels CSS. */
const MARGE_FENETRE = 110;
/** Sous cette largeur (téléphone, colonne étroite), le cadre est carré : la roue entière y tient. */
const LARGEUR_CADRE_CARRE = 600;

/**
 * Hauteur du cadre de la carte, en pixels CSS, pour une largeur de colonne et
 * une hauteur de fenêtre données : tenir dans la fenêtre, et rester plus large
 * que haut (au moins 5:4) pour laisser la place aux compétences éclatées.
 *
 * @param hauteurMax plafond en pixels CSS (plus haut sur les très grands écrans)
 */
export function hauteurCadre(largeur: number, hauteurFenetre: number, hauteurMax: number = HAUTEUR_CADRE_MAX): number {
  if (!Number.isFinite(largeur) || largeur <= 0) return 0;
  const fenetre = Number.isFinite(hauteurFenetre) && hauteurFenetre > 0 ? hauteurFenetre - MARGE_FENETRE : hauteurMax;
  if (largeur < LARGEUR_CADRE_CARRE) return Math.round(Math.max(160, Math.min(largeur, fenetre)));
  return Math.round(Math.max(240, Math.min(hauteurMax, fenetre, largeur * 0.8)));
}
