// SPDX-License-Identifier: CECILL-2.1
/**
 * Couleur de chaque niveau de maîtrise : du pétrole pâle (premier niveau) au
 * pétrole foncé (dernier), selon l'identité visuelle. Calculs seuls.
 */

/** Teintes repères, en rouge, vert, bleu ; un niveau prend la teinte de sa position, interpolée entre deux repères. */
export const TEINTES_NIVEAUX: readonly (readonly [number, number, number])[] = [
  [168, 210, 212],
  [98, 169, 174],
  [42, 127, 136],
  [16, 85, 95],
];

/** Encre sombre de l'identité, posée sur les teintes claires. */
const ENCRE_SOMBRE = "#1C1A15";

/** Place du niveau `rang` (à partir de 0) sur `nombre` niveaux, de 0 à 1 ; un niveau seul vaut 1. */
export function positionNiveau(rang: number, nombre: number): number {
  return nombre > 1 ? Math.min(1, Math.max(0, rang / (nombre - 1))) : 1;
}

/** Couleur du niveau `rang` sur `nombre` niveaux, au format CSS `rgb(r g b)`. */
export function couleurNiveau(rang: number, nombre: number): string {
  const etendue = positionNiveau(rang, nombre) * (TEINTES_NIVEAUX.length - 1);
  const avant = Math.floor(Math.min(etendue, TEINTES_NIVEAUX.length - 2));
  const part = etendue - avant;
  const debut = TEINTES_NIVEAUX[avant] ?? [0, 0, 0];
  const fin = TEINTES_NIVEAUX[avant + 1] ?? debut;
  return `rgb(${debut.map((valeur, indice) => Math.round(valeur + ((fin[indice] ?? valeur) - valeur) * part)).join(" ")})`;
}

/** Encre lisible sur la couleur d'un niveau : sombre sur la première moitié, blanche ensuite. */
export function encreNiveau(rang: number, nombre: number): string {
  return positionNiveau(rang, nombre) < 0.5 ? ENCRE_SOMBRE : "#FFFFFF";
}
