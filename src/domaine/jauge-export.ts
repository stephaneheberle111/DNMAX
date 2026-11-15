// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Jauge des exports Word et OpenDocument : largeur des libellés de niveaux
 * écrits au-dessus de la jauge. Calculs seuls, en twips (1/1440 de pouce).
 */

/** Largeur moyenne d'un caractère, en twips par point de corps (Calibri, environ un demi-cadratin, avec une marge). */
const TWIPS_PAR_CARACTERE_ET_POINT = 11;
/** Marge autour d'un libellé, pour qu'il ne touche pas son voisin. */
const MARGE_LIBELLE = 60;

/**
 * Largeur sous laquelle le mot le plus long du libellé serait coupé en deux
 * par le traitement de texte, pour un corps de `taillePt` points.
 */
export function largeurMinimaleLibelle(libelle: string, taillePt: number): number {
  const plusLong = Math.max(0, ...libelle.split(/\s+/).map((mot) => mot.length));
  return Math.ceil(plusLong * taillePt * TWIPS_PAR_CARACTERE_ET_POINT) + MARGE_LIBELLE;
}

/** Arrondit en gardant la somme : l'écart d'arrondi va à la plus grande largeur. */
function arrondirEnGardantLeTotal(largeurs: readonly number[], total: number): number[] {
  const arrondies = largeurs.map((largeur) => Math.round(largeur));
  const ecart = total - arrondies.reduce((somme, largeur) => somme + largeur, 0);
  const plusGrande = arrondies.indexOf(Math.max(...arrondies));
  if (plusGrande >= 0) {
    arrondies[plusGrande] = (arrondies[plusGrande] ?? 0) + ecart;
  }
  return arrondies;
}

/**
 * Largeur de chaque libellé de niveau, dans l'ordre des niveaux.
 *
 * Chaque libellé suit la zone de son niveau dans la jauge (`bornes`, en
 * pourcentage, de 0 à 100), sauf s'il y serait trop à l'étroit : il reçoit
 * alors son minimum, pris sur les zones plus larges au prorata de leur taille.
 * La somme vaut toujours `total`. Si la jauge est trop étroite pour tous les
 * minimums, elle est partagée au prorata de ceux-ci.
 */
export function largeursLibellesNiveaux(bornes: readonly number[], total: number, minimums: readonly number[]): number[] {
  const nombre = minimums.length;
  if (nombre === 0) {
    return [];
  }
  const sommeMinimums = minimums.reduce((somme, minimum) => somme + minimum, 0);
  if (sommeMinimums >= total) {
    return arrondirEnGardantLeTotal(
      minimums.map((minimum) => (total * minimum) / sommeMinimums),
      total,
    );
  }
  const zones = minimums.map((_, rang) => (total * ((bornes[rang + 1] ?? 100) - (bornes[rang] ?? 0))) / 100);
  const fixes = new Set<number>();
  let largeurs = zones;
  // Chaque tour fixe au moins un libellé de plus à son minimum : au plus `nombre` tours.
  for (let tour = 0; tour < nombre; tour++) {
    const reste = total - [...fixes].reduce((somme, rang) => somme + (minimums[rang] ?? 0), 0);
    const zonesLibres = zones.reduce((somme, zone, rang) => (fixes.has(rang) ? somme : somme + zone), 0);
    largeurs = zones.map((zone, rang) => (fixes.has(rang) ? (minimums[rang] ?? 0) : (reste * zone) / zonesLibres));
    const tropEtroits = largeurs.map((largeur, rang) => rang).filter((rang) => !fixes.has(rang) && (largeurs[rang] ?? 0) < (minimums[rang] ?? 0));
    if (tropEtroits.length === 0) {
      break;
    }
    tropEtroits.forEach((rang) => fixes.add(rang));
  }
  return arrondirEnGardantLeTotal(largeurs, total);
}

/** Tailles essayées pour les libellés, de la plus grande à la plus petite (en points). */
export const TAILLES_LIBELLES = [7, 6.5, 6] as const;

/**
 * Taille et largeurs des libellés de niveaux au-dessus d'une jauge de `total`
 * twips : la plus grande taille de `tailles` où chaque mot tient sans coupure,
 * sinon la plus petite (les largeurs sont alors partagées au prorata des minimums).
 */
export function dispositionLibellesNiveaux(
  libelles: readonly string[],
  bornes: readonly number[],
  total: number,
  tailles: readonly number[] = TAILLES_LIBELLES,
): { taille: number; largeurs: number[] } {
  const minimumsPour = (taille: number): number[] => libelles.map((libelle) => largeurMinimaleLibelle(libelle, taille));
  const taille =
    tailles.find((candidate) => minimumsPour(candidate).reduce((somme, minimum) => somme + minimum, 0) <= total) ??
    tailles.at(-1) ??
    TAILLES_LIBELLES[0];
  return { taille, largeurs: largeursLibellesNiveaux(bornes, total, minimumsPour(taille)) };
}
