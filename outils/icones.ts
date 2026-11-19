// SPDX-License-Identifier: CECILL-2.1
/*
 * Dessin de l'icône de l'application (série 8, décision 4) : « D + N en grand,
 * le D seul en petit ». Sur un pavé pétrole arrondi (rx 22 sur 100), le D et le N
 * en pièces blanches et ambre clair à partir de 64 px, le D seul en dessous.
 * Une version sans fond, le D seul, sert d'icône de fenêtre pour la barre des
 * tâches : pétrole et ambre sur une barre claire, blanc et ambre clair sur une
 * barre sombre. Tracés et mises en place repris de la planche de l'icône.
 * Calculs seuls, sans accès aux fichiers.
 */
import { LETTRE_D, LETTRE_N, dessinerLettres, peintureCouleurs } from "../src/identite-pieces.ts";

export type NiveauDetail = "dn" | "d";

/** 64 px et plus : D + N ; moins de 64 px : le D seul, qui reste lisible. */
export function niveauDetail(taillePixels: number): NiveauDetail {
  return taillePixels >= 64 ? "dn" : "d";
}

export const COULEURS_ICONE = { pave: "#10555F", design: "#FFFFFF", art: "#E9B978" } as const;

/** Couleurs du D sans fond : « clair » pour une barre des tâches claire, « sombre » pour une barre sombre. */
export const COULEURS_SANS_FOND = {
  clair: { design: "#10555F", art: "#C27A2C" },
  sombre: { design: "#FFFFFF", art: "#E9B978" },
} as const;

export type BarreDesTaches = keyof typeof COULEURS_SANS_FOND;

/** Pavé et place des lettres, tels que la planche les pose à chaque niveau (le pavé du D est rentré d'une demi-unité). */
const MISE_EN_PAGE: Readonly<Record<NiveauDetail, { readonly pave: string; readonly place: string }>> = {
  dn: { pave: '<rect width="100" height="100" rx="22"', place: "translate(6 25) scale(0.5)" },
  d: { pave: '<rect x="0.5" y="0.5" width="99" height="99" rx="22"', place: "translate(17.44 13) scale(0.74)" },
};

function enteteSvg(viewBox: string, taillePixels: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${String(taillePixels)}" height="${String(taillePixels)}">`;
}

/** SVG de l'icône de l'application, au niveau de détail de la taille demandée. */
export function svgIcone(taillePixels: number): string {
  const niveau = niveauDetail(taillePixels);
  const lettres = niveau === "dn" ? [LETTRE_D, LETTRE_N] : [LETTRE_D];
  return (
    enteteSvg("0 0 100 100", taillePixels) +
    `${MISE_EN_PAGE[niveau].pave} fill="${COULEURS_ICONE.pave}"/>` +
    `<g transform="${MISE_EN_PAGE[niveau].place}">` +
    dessinerLettres(lettres, peintureCouleurs(COULEURS_ICONE.design, COULEURS_ICONE.art)) +
    `</g></svg>`
  );
}

/** SVG du D sans fond (transparent), pour une barre des tâches claire ou sombre. */
export function svgIconeSansFond(taillePixels: number, barre: BarreDesTaches): string {
  const couleurs = COULEURS_SANS_FOND[barre];
  return enteteSvg("-6 0 100 100", taillePixels) + dessinerLettres([LETTRE_D], peintureCouleurs(couleurs.design, couleurs.art)) + `</svg>`;
}

/** Entrée d'un fichier d'icônes : sa taille en pixels et son image PNG. */
export interface ImageIcone {
  readonly taille: number;
  readonly png: Uint8Array;
}

/**
 * Fichier .ico (Windows) contenant des images PNG, une par taille.
 * Une taille de 256 px s'écrit 0 dans l'en-tête, selon le format.
 */
export function assemblerIco(images: readonly ImageIcone[]): Uint8Array {
  const entete = 6 + 16 * images.length;
  const total = entete + images.reduce((somme, image) => somme + image.png.length, 0);
  const fichier = new Uint8Array(total);
  const vue = new DataView(fichier.buffer);
  vue.setUint16(2, 1, true);
  vue.setUint16(4, images.length, true);
  let position = entete;
  images.forEach((image, rang) => {
    const entree = 6 + 16 * rang;
    const cote = image.taille >= 256 ? 0 : image.taille;
    vue.setUint8(entree, cote);
    vue.setUint8(entree + 1, cote);
    vue.setUint16(entree + 4, 1, true);
    vue.setUint16(entree + 6, 32, true);
    vue.setUint32(entree + 8, image.png.length, true);
    vue.setUint32(entree + 12, position, true);
    fichier.set(image.png, position);
    position += image.png.length;
  });
  return fichier;
}

/** Types d'entrées .icns (macOS) pour des images PNG, par taille en pixels. */
const TYPES_ICNS: Readonly<Record<number, string>> = {
  16: "icp4",
  32: "icp5",
  64: "icp6",
  128: "ic07",
  256: "ic08",
  512: "ic09",
  1024: "ic10",
};

/** Fichier .icns (macOS) ; une taille sans type connu lève une erreur. */
export function assemblerIcns(images: readonly ImageIcone[]): Uint8Array {
  const total = 8 + images.reduce((somme, image) => somme + 8 + image.png.length, 0);
  const fichier = new Uint8Array(total);
  const vue = new DataView(fichier.buffer);
  const ecrireType = (position: number, type: string): void => {
    for (let rang = 0; rang < 4; rang += 1) vue.setUint8(position + rang, type.charCodeAt(rang));
  };
  ecrireType(0, "icns");
  vue.setUint32(4, total);
  let position = 8;
  for (const image of images) {
    const type = TYPES_ICNS[image.taille];
    if (type === undefined) throw new Error(`taille ${String(image.taille)} sans type .icns`);
    ecrireType(position, type);
    vue.setUint32(position + 4, 8 + image.png.length);
    fichier.set(image.png, position + 8);
    position += 8 + image.png.length;
  }
  return fichier;
}
