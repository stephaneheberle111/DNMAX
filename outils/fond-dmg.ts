// SPDX-License-Identifier: CECILL-2.1
/*
 * Fond de la fenêtre d'installation sous macOS (celle qu'ouvre le .dmg) : un
 * bandeau pétrole avec le logotype, puis, sur le papier, la flèche qui mène de
 * l'icône de DNMAX au dossier Applications, et la consigne. Les deux icônes et
 * leurs noms sont posés par macOS, aux places notées dans tauri.conf.json.
 * Calculs seuls, sans accès aux fichiers.
 */
import { crc32 } from "node:zlib";
import { LARGEUR_LOGOTYPE, LOGOTYPE_DNMAX, dessinerLettres, peintureCouleurs } from "../src/identite-pieces.ts";
import { COULEURS_ICONE, COULEURS_SANS_FOND } from "./icones.ts";

/** Taille de la fenêtre, en points : celle de `bundle.macOS.dmg.windowSize`. */
export const FENETRE_DMG = { largeur: 660, hauteur: 400 } as const;

/** Centre des deux icônes, en points : `appPosition` et `applicationFolderPosition`. */
export const PLACES_DMG = { application: { x: 180, y: 220 }, dossierApplications: { x: 480, y: 220 } } as const;

/** L'image compte deux pixels par point, pour rester nette sur les écrans Retina. */
export const DENSITE_DMG = 2;

const HAUTEUR_BANDEAU = 104;
const PAPIER = "#F6F2E9";
const ENCRE_DOUCE = "#6B6455";
const CONSIGNE = "Glissez DNMAX dans Applications";

/**
 * Page à photographier pour obtenir le fond. `policeBase64` est la police du
 * site (Public Sans, WOFF2), fournie par l'appelant pour que le texte ne
 * dépende pas des polices de la machine qui génère l'image.
 */
export function pageFondDmg(policeBase64: string): string {
  const milieu = (PLACES_DMG.application.x + PLACES_DMG.dossierApplications.x) / 2;
  const hauteurLogotype = 46;
  const largeurLogotype = (hauteurLogotype * LARGEUR_LOGOTYPE) / 100;
  return (
    `<!doctype html><meta charset="utf-8"><style>` +
    `@font-face{font-family:"Public Sans";src:url(data:font/woff2;base64,${policeBase64}) format("woff2")}` +
    `html,body{margin:0}` +
    `body{width:${String(FENETRE_DMG.largeur)}px;height:${String(FENETRE_DMG.hauteur)}px;background:${PAPIER};position:relative;overflow:hidden}` +
    `.bandeau{height:${String(HAUTEUR_BANDEAU)}px;background:${COULEURS_ICONE.pave};display:flex;align-items:center;justify-content:center}` +
    `.fleche{position:absolute;left:${String(milieu - 40)}px;top:${String(PLACES_DMG.application.y - 22)}px}` +
    `.consigne{position:absolute;left:0;right:0;bottom:30px;text-align:center;font:13px "Public Sans",sans-serif;color:${ENCRE_DOUCE}}` +
    `</style>` +
    `<div class="bandeau"><svg width="${String(largeurLogotype)}" height="${String(hauteurLogotype)}" viewBox="0 0 ${String(LARGEUR_LOGOTYPE)} 100">` +
    dessinerLettres(LOGOTYPE_DNMAX, peintureCouleurs(COULEURS_ICONE.design, COULEURS_ICONE.art)) +
    `</svg></div>` +
    `<svg class="fleche" width="80" height="44" viewBox="0 0 80 44"><path d="M4 22H66M50 8L68 22L50 36" fill="none" ` +
    `stroke="${COULEURS_SANS_FOND.clair.art}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
    `<p class="consigne">${CONSIGNE}</p>`
  );
}

const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Fin du premier bloc (IHDR), toujours de la même taille : signature, longueur, nom, 13 octets, somme de contrôle. */
const FIN_IHDR = 8 + 4 + 4 + 13 + 4;
const POINTS_PAR_METRE = 72 / 0.0254;

/**
 * Inscrit dans un PNG sa densité, en pixels par point (bloc pHYs, placé juste
 * après l'en-tête). macOS affiche alors une image de 1320 × 800 pixels à 2 pixels
 * par point dans une fenêtre de 660 × 400 points, au lieu de l'agrandir.
 * Lève une erreur si le fichier n'est pas un PNG ou porte déjà une densité.
 */
export function inscrireDensitePng(png: Uint8Array, pixelsParPoint: number): Uint8Array {
  if (png.length < FIN_IHDR || SIGNATURE_PNG.some((octet, rang) => png[rang] !== octet)) {
    throw new Error("Ce fichier n'est pas une image PNG.");
  }
  if (String.fromCharCode(...png.subarray(FIN_IHDR + 4, FIN_IHDR + 8)) === "pHYs") {
    throw new Error("Cette image PNG porte déjà une densité.");
  }
  if (!Number.isFinite(pixelsParPoint) || pixelsParPoint <= 0) {
    throw new Error(`Densité invalide : ${String(pixelsParPoint)}`);
  }
  const pixelsParMetre = Math.round(pixelsParPoint * POINTS_PAR_METRE);
  const bloc = new Uint8Array(4 + 4 + 9 + 4);
  const vue = new DataView(bloc.buffer);
  vue.setUint32(0, 9);
  bloc.set([0x70, 0x48, 0x59, 0x73], 4);
  vue.setUint32(8, pixelsParMetre);
  vue.setUint32(12, pixelsParMetre);
  vue.setUint8(16, 1);
  vue.setUint32(17, crc32(bloc.subarray(4, 17)));
  const sortie = new Uint8Array(png.length + bloc.length);
  sortie.set(png.subarray(0, FIN_IHDR), 0);
  sortie.set(bloc, FIN_IHDR);
  sortie.set(png.subarray(FIN_IHDR), FIN_IHDR + bloc.length);
  return sortie;
}
