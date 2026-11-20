// SPDX-License-Identifier: CECILL-2.1
/*
 * Images de l'installeur Windows (src-tauri/windows/habillage/) : le logotype en
 * deux tailles et le pavé du bouton principal, sur le fond pétrole des pages.
 * L'installeur ne sait afficher que des images .bmp, sans les redimensionner
 * proprement : chaque image existe donc à chaque échelle d'affichage de Windows.
 * Calculs seuls, sans accès aux fichiers.
 */
import { LOGOTYPE_DNMAX, dessinerLettres, peintureCouleurs } from "../src/identite-pieces.ts";
import { inflateSync } from "node:zlib";
import { COULEURS_ICONE } from "./icones.ts";

/** Échelles d'affichage de Windows couvertes, en pourcentage ; les mêmes que dans habillage-installeur.nsh. */
export const ECHELLES_INSTALLEUR = [100, 125, 150, 175, 200, 250, 300] as const;

/** Fond des pages de l'installeur, et couleur du pavé du bouton principal. */
export const COULEURS_INSTALLEUR = { fond: COULEURS_ICONE.pave, bouton: COULEURS_ICONE.art } as const;

/** Rayon des coins du bouton, en pixels à 100 %. */
const RAYON_BOUTON = 7;

/**
 * Cadre du logotype : les lettres occupent la bande de 10 à 90 du repère, et une
 * marge de 4 les entoure, pour que les bords de l'image soient du fond uni.
 */
const CADRE_LOGOTYPE = { x: 6, y: 6, largeur: 436, hauteur: 88 } as const;

export interface ImageInstalleur {
  /** Nom du fichier, sans l'échelle ni l'extension. */
  readonly nom: string;
  /** Taille en pixels à 100 %, celle des cotes de habillage-installeur.nsh. */
  readonly largeur: number;
  readonly hauteur: number;
  /** Dessin à la taille en pixels demandée. */
  readonly svg: (largeur: number, hauteur: number) => string;
}

function enteteSvg(viewBox: string, largeur: number, hauteur: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${String(largeur)}" height="${String(hauteur)}">`;
}

/** Le logotype DNMAX, blanc et ambre clair, sur le fond pétrole. */
export function svgLogotypeInstalleur(largeur: number, hauteur: number): string {
  return (
    enteteSvg(`${String(CADRE_LOGOTYPE.x)} ${String(CADRE_LOGOTYPE.y)} ${String(CADRE_LOGOTYPE.largeur)} ${String(CADRE_LOGOTYPE.hauteur)}`, largeur, hauteur) +
    `<rect x="${String(CADRE_LOGOTYPE.x)}" y="${String(CADRE_LOGOTYPE.y)}" width="${String(CADRE_LOGOTYPE.largeur)}" height="${String(CADRE_LOGOTYPE.hauteur)}" fill="${COULEURS_INSTALLEUR.fond}"/>` +
    dessinerLettres(LOGOTYPE_DNMAX, peintureCouleurs(COULEURS_ICONE.design, COULEURS_ICONE.art)) +
    `</svg>`
  );
}

/** Le pavé ambre du bouton principal, coins arrondis, sur le fond pétrole. Le texte est posé par l'installeur. */
export function svgBoutonInstalleur(largeur: number, hauteur: number, echelle: number): string {
  const rayon = (RAYON_BOUTON * echelle) / 100;
  return (
    enteteSvg(`0 0 ${String(largeur)} ${String(hauteur)}`, largeur, hauteur) +
    `<rect width="${String(largeur)}" height="${String(hauteur)}" fill="${COULEURS_INSTALLEUR.fond}"/>` +
    `<rect width="${String(largeur)}" height="${String(hauteur)}" rx="${String(rayon)}" fill="${COULEURS_INSTALLEUR.bouton}"/>` +
    `</svg>`
  );
}

/** Les images de l'installeur, à leur taille à 100 %. */
export function imagesInstalleur(echelle: number): readonly ImageInstalleur[] {
  return [
    { nom: "logotype-grand", largeur: 233, hauteur: 47, svg: svgLogotypeInstalleur },
    { nom: "logotype-petit", largeur: 139, hauteur: 28, svg: svgLogotypeInstalleur },
    { nom: "bouton", largeur: 190, hauteur: 40, svg: (largeur, hauteur) => svgBoutonInstalleur(largeur, hauteur, echelle) },
  ];
}

/** Une cote à 100 % mise à l'échelle, arrondie au pixel inférieur comme le fait l'installeur. */
export function coteALEchelle(cote: number, echelle: number): number {
  return Math.floor((cote * echelle) / 100);
}

const ENTETE_BMP = 54;

/**
 * Fichier .bmp 24 bits, sans transparence, à partir de pixels RVBA rangés de haut
 * en bas (ceux d'un canevas). Le format range les lignes de bas en haut, en bleu,
 * vert, rouge, chacune complétée à un multiple de quatre octets.
 * Lève une erreur si le nombre de pixels ne correspond pas à la taille annoncée.
 */
export function encoderBmp(largeur: number, hauteur: number, rvba: Uint8Array): Uint8Array {
  if (!Number.isInteger(largeur) || !Number.isInteger(hauteur) || largeur <= 0 || hauteur <= 0) {
    throw new Error(`Taille d'image invalide : ${String(largeur)} × ${String(hauteur)}`);
  }
  if (rvba.length !== largeur * hauteur * 4) {
    throw new Error(`Pixels attendus : ${String(largeur * hauteur * 4)} octets, reçus : ${String(rvba.length)}`);
  }
  const ligne = Math.ceil((largeur * 3) / 4) * 4;
  const fichier = new Uint8Array(ENTETE_BMP + ligne * hauteur);
  const vue = new DataView(fichier.buffer);
  fichier[0] = 0x42;
  fichier[1] = 0x4d;
  vue.setUint32(2, fichier.length, true);
  vue.setUint32(10, ENTETE_BMP, true);
  vue.setUint32(14, 40, true);
  vue.setInt32(18, largeur, true);
  vue.setInt32(22, hauteur, true);
  vue.setUint16(26, 1, true);
  vue.setUint16(28, 24, true);
  vue.setUint32(34, ligne * hauteur, true);
  for (let y = 0; y < hauteur; y += 1) {
    const depart = ENTETE_BMP + (hauteur - 1 - y) * ligne;
    for (let x = 0; x < largeur; x += 1) {
      const source = (y * largeur + x) * 4;
      fichier[depart + x * 3] = rvba[source + 2] ?? 0;
      fichier[depart + x * 3 + 1] = rvba[source + 1] ?? 0;
      fichier[depart + x * 3 + 2] = rvba[source] ?? 0;
    }
  }
  return fichier;
}

/** Polices du site reprises par l'installeur : fichier de @fontsource (jeu latin) et nom du fichier produit. */
export const POLICES_INSTALLEUR = [
  { source: "@fontsource/public-sans/files/public-sans-latin-400-normal.woff", nom: "public-sans-400" },
  { source: "@fontsource/public-sans/files/public-sans-latin-600-normal.woff", nom: "public-sans-600" },
  { source: "@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff", nom: "bricolage-grotesque-700" },
] as const;

const ENTETE_WOFF = 44;
const ENTREE_WOFF = 20;
const ENTETE_SFNT = 12;
const ENTREE_SFNT = 16;

/**
 * Convertit une police WOFF (version 1) en fichier TrueType ou OpenType, le seul
 * format que Windows sait charger pour un programme : les tables sont les mêmes,
 * décompressées et rangées derrière un autre en-tête.
 * Lève une erreur si le fichier n'est pas un WOFF ou s'il est tronqué.
 */
export function woffVersSfnt(woff: Uint8Array): Uint8Array {
  const vue = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  if (woff.length < ENTETE_WOFF || vue.getUint32(0) !== 0x774f4646) {
    throw new Error("Ce fichier n'est pas une police WOFF.");
  }
  const nombre = vue.getUint16(12);
  if (woff.length < ENTETE_WOFF + nombre * ENTREE_WOFF) {
    throw new Error("Police WOFF tronquée : table des matières incomplète.");
  }
  const tables = Array.from({ length: nombre }, (_, rang) => {
    const entree = ENTETE_WOFF + rang * ENTREE_WOFF;
    const position = vue.getUint32(entree + 4);
    const tailleCompressee = vue.getUint32(entree + 8);
    const taille = vue.getUint32(entree + 12);
    if (position + tailleCompressee > woff.length) {
      throw new Error("Police WOFF tronquée : table incomplète.");
    }
    const brut = woff.subarray(position, position + tailleCompressee);
    const donnees = tailleCompressee < taille ? new Uint8Array(inflateSync(brut)) : brut;
    if (donnees.length !== taille) {
      throw new Error("Police WOFF invalide : une table n'a pas la taille annoncée.");
    }
    return { etiquette: vue.getUint32(entree), somme: vue.getUint32(entree + 16), donnees };
  }).sort((a, b) => a.etiquette - b.etiquette);

  const aligner = (taille: number): number => Math.ceil(taille / 4) * 4;
  const debut = ENTETE_SFNT + nombre * ENTREE_SFNT;
  const sfnt = new Uint8Array(debut + tables.reduce((somme, table) => somme + aligner(table.donnees.length), 0));
  const sortie = new DataView(sfnt.buffer);
  const puissance = nombre > 0 ? Math.floor(Math.log2(nombre)) : 0;
  sortie.setUint32(0, vue.getUint32(4));
  sortie.setUint16(4, nombre);
  sortie.setUint16(6, 2 ** puissance * 16);
  sortie.setUint16(8, puissance);
  sortie.setUint16(10, nombre * 16 - 2 ** puissance * 16);
  let position = debut;
  tables.forEach((table, rang) => {
    const entree = ENTETE_SFNT + rang * ENTREE_SFNT;
    sortie.setUint32(entree, table.etiquette);
    sortie.setUint32(entree + 4, table.somme);
    sortie.setUint32(entree + 8, position);
    sortie.setUint32(entree + 12, table.donnees.length);
    sfnt.set(table.donnees, position);
    position += aligner(table.donnees.length);
  });
  return sfnt;
}
