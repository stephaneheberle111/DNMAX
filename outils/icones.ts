// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Dessin de l'icône de l'application : le signe X « plein & délié », blanc et
 * pétrole clair, sur un pavé pétrole arrondi. Le plein s'effile vers le bas
 * (tracé « intermédiaire 2 », entre l'ancien plein et le coup de gouge) ; il est
 * le même à toutes les tailles. Le délié a trois niveaux de détail selon la
 * taille d'affichage, son écart à la croisée gardant le même dégagement autour
 * du plein. Calculs seuls, sans accès aux fichiers.
 */

export type NiveauDetail = "fin" | "moyen" | "simple";

/** 88 px et plus : fin ; de 40 à 87 px : moyen ; moins de 40 px : simple. */
export function niveauDetail(taillePixels: number): NiveauDetail {
  if (taillePixels >= 88) return "fin";
  return taillePixels >= 40 ? "moyen" : "simple";
}

interface DessinSigne {
  /** Trait fin (délié), avec ses deux petits traits d'extrémité sauf au niveau simple. */
  readonly delie: string;
  readonly epaisseurDelie: number;
  /** Trait plein, large et légèrement courbe. */
  readonly plein: string;
  /** Place du signe dans le pavé (repère 100 × 100). */
  readonly decalage: number;
  readonly echelle: number;
}

/** Plein du signe, effilé vers le bas, identique à tous les niveaux de détail. */
export const PLEIN = "M15 26.5 42.5 13C59.5 33 72.5 55.5 81 82.5L74 86C56.5 66.5 38.5 45.5 15 26.5Z";

export const SIGNES: Readonly<Record<NiveauDetail, DessinSigne>> = {
  fin: {
    delie: "M12 88 43 57M63.6 36.4 88 12M7.4 83.4l9.2 9.2M83.4 7.4l9.2 9.2",
    epaisseurDelie: 2.6,
    plein: PLEIN,
    decalage: 14,
    echelle: 0.72,
  },
  moyen: {
    delie: "M13 87 42.1 57.9M64.5 35.5 87 13M8 82l10 10M82 8l10 10",
    epaisseurDelie: 4.6,
    plein: PLEIN,
    decalage: 13,
    echelle: 0.74,
  },
  simple: {
    delie: "M17 85 40.6 59.4M67.7 32.3 85 17",
    epaisseurDelie: 8.5,
    plein: PLEIN,
    decalage: 12,
    echelle: 0.76,
  },
};

export const COULEURS_ICONE = { pave: "#10555F", delie: "#A8D2D4", plein: "#FFFFFF" } as const;

/** SVG de l'icône de l'application, dessiné au niveau de détail de la taille demandée. */
export function svgIcone(taillePixels: number): string {
  const signe = SIGNES[niveauDetail(taillePixels)];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${String(taillePixels)}" height="${String(taillePixels)}">` +
    `<rect width="100" height="100" rx="22" fill="${COULEURS_ICONE.pave}"/>` +
    `<g transform="translate(${String(signe.decalage)} ${String(signe.decalage)}) scale(${String(signe.echelle)})">` +
    `<path d="${signe.delie}" fill="none" stroke="${COULEURS_ICONE.delie}" stroke-width="${String(signe.epaisseurDelie)}" stroke-linecap="round"/>` +
    `<path d="${signe.plein}" fill="${COULEURS_ICONE.plein}"/>` +
    `</g></svg>`
  );
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
