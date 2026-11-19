// SPDX-License-Identifier: CECILL-2.1
/*
 * Le logotype DNMAX « en pièces » (série 8, décision 4) : chaque lettre est
 * faite de deux ou trois formes premières, pétrole pour le design, ambre pour
 * les métiers d'art. Tracés repris tels quels de la planche du logotype, dans
 * un repère de 100 de haut où les lettres occupent la bande de 10 à 90.
 * Calculs seuls : rend du texte SVG, sans accès à la page.
 */

/** Pétrole (design) ou ambre (métiers d'art) : à gauche ou en haut le design, à droite ou en bas les métiers d'art. */
export type SortePiece = "design" | "art";

export interface Piece {
  readonly d: string;
  readonly sorte: SortePiece;
}

export interface Lettre {
  readonly lettre: string;
  /** Décalage horizontal de la lettre dans le mot, en unités du repère. */
  readonly decalage: number;
  readonly pieces: readonly Piece[];
}

export const LETTRE_D: Lettre = {
  lettre: "D",
  decalage: 0,
  pieces: [
    { d: "M10 10 H34 V90 H10 Z", sorte: "design" },
    { d: "M38 10 A40 40 0 0 1 38 90 Z", sorte: "art" },
  ],
};

export const LETTRE_N: Lettre = {
  lettre: "N",
  decalage: 80,
  pieces: [
    { d: "M10.00 10.00 L34.00 10.00 L34.00 90.00 L10.00 90.00 Z", sorte: "design" },
    { d: "M38.00 18.00 L38.00 42.00 L86.00 90.00 L86.00 66.00 Z", sorte: "art" },
    { d: "M62.00 10.00 L86.00 10.00 L86.00 60.34 L62.00 36.34 Z", sorte: "design" },
  ],
};

/** Les cinq lettres du nom : quatorze pièces, deux vides (planche 40). */
export const LOGOTYPE_DNMAX: readonly Lettre[] = [
  LETTRE_D,
  LETTRE_N,
  {
    lettre: "M",
    decalage: 168,
    pieces: [
      { d: "M10.00 10.00 L34.00 34.00 L34.00 90.00 L10.00 90.00 Z", sorte: "design" },
      { d: "M15.66 10.00 L100.34 10.00 L58.00 52.34 Z", sorte: "art" },
      { d: "M106.00 10.00 L106.00 90.00 L82.00 90.00 L82.00 34.00 Z", sorte: "design" },
    ],
  },
  {
    lettre: "A",
    decalage: 276,
    pieces: [
      { d: "M10.00 10.00 L34.00 10.00 L34.00 90.00 L10.00 90.00 Z", sorte: "design" },
      { d: "M38.00 10.00 L38.00 34.00 L94.00 90.00 L94.00 66.00 Z", sorte: "art" },
      { d: "M38.00 62.00 L60.34 62.00 L72.34 74.00 L38.00 74.00 Z", sorte: "design" },
    ],
  },
  {
    lettre: "X",
    decalage: 372,
    pieces: [
      { d: "M10.00 10.00 L10.00 34.00 L66.00 90.00 L66.00 66.00 Z", sorte: "art" },
      { d: "M10.00 66.00 L10.00 90.00 L35.17 64.83 L23.17 52.83 Z M66.00 34.00 L66.00 10.00 L40.83 35.17 L52.83 47.17 Z", sorte: "design" },
    ],
  },
];

/** Largeur du repère du logotype entier, marges comprises. */
export const LARGEUR_LOGOTYPE = 448;

/** Attributs de peinture d'une pièce : une couleur (`fill="…"`) ou une classe de la feuille de styles. */
export type Peinture = (sorte: SortePiece) => string;

/** Peinture par classes `piece-design` et `piece-art`, dont les couleurs suivent le thème (src/identite.css). */
export const PEINTURE_CLASSES: Peinture = (sorte) => `class="piece-${sorte}"`;

/** Peinture par deux couleurs fixes, pour les images (icônes) qui ne lisent aucune feuille de styles. */
export function peintureCouleurs(design: string, art: string): Peinture {
  return (sorte) => `fill="${sorte === "design" ? design : art}"`;
}

/** Les groupes `<g>` des lettres, chacune décalée à sa place, sans la balise `<svg>`. */
export function dessinerLettres(lettres: readonly Lettre[], peinture: Peinture): string {
  return lettres
    .map(
      (lettre) =>
        `<g transform="translate(${lettre.decalage.toFixed(2)} 0)">` +
        lettre.pieces.map((piece) => `<path d="${piece.d}" ${peinture(piece.sorte)}/>`).join("") +
        `</g>`,
    )
    .join("");
}

/**
 * Le logotype DNMAX en SVG, nommé « DNMAX » pour les lecteurs d'écran.
 * `classe` s'ajoute à la balise `<svg>` ; la taille se règle par la feuille de styles.
 */
export function svgLogotype(classe: string, peinture: Peinture = PEINTURE_CLASSES): string {
  return (
    `<svg class="${classe}" viewBox="0 0 ${String(LARGEUR_LOGOTYPE)} 100" role="img" aria-label="DNMAX">` +
    dessinerLettres(LOGOTYPE_DNMAX, peinture) +
    `</svg>`
  );
}

/** « DN » seul, cadré au plus près des pièces (planche 44, volet de l'écran d'ouverture), décoratif. */
export function svgDN(classe: string, peinture: Peinture = PEINTURE_CLASSES): string {
  return `<svg class="${classe}" viewBox="10 10 156 80" aria-hidden="true">${dessinerLettres([LETTRE_D, LETTRE_N], peinture)}</svg>`;
}
