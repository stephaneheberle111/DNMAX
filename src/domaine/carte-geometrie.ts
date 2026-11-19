// SPDX-License-Identifier: CECILL-2.1
/**
 * Calculs de la carte radiale et de la carte heuristique, sans dessin :
 * tracé d'un secteur d'anneau, coordonnées polaires, coupe d'un libellé en
 * lignes. Repris du fichier historique (décision 38) à l'identique,
 * arrondis compris : le dessin des cartes, qui les appelle, n'en voit pas
 * la différence.
 */

/**
 * Tracé SVG d'un secteur d'anneau entre les rayons `r0` et `r1` et les
 * angles `a0` et `a1` (en radians), coordonnées arrondies au centième.
 */
export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const point = (rayon: number, angle: number): [string, string] => [(cx + rayon * Math.cos(angle)).toFixed(2), (cy + rayon * Math.sin(angle)).toFixed(2)];
  const grand = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = point(r1, a0);
  const [x1, y1] = point(r1, a1);
  const [x2, y2] = point(r0, a1);
  const [x3, y3] = point(r0, a0);
  return `M${x0} ${y0}A${String(r1)} ${String(r1)} 0 ${String(grand)} 1 ${x1} ${y1}L${x2} ${y2}A${String(r0)} ${String(r0)} 0 ${String(grand)} 0 ${x3} ${y3}Z`;
}

/** Point à la distance `r` du centre (`c`, `c`), dans la direction `a` (radians). */
export function polar(c: number, r: number, a: number): [number, number] {
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
}

/**
 * Coupe un texte en lignes d'au plus `n` caractères, et au plus `max`
 * lignes (la dernière finit alors par « … »). Un mot trop long est coupé
 * par un tiret, ou abrégé par « … » si `cut` est vrai.
 */
export function wrapN(texte: unknown, n: number, max: number, cut?: boolean): string[] {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
  const bruts = String(texte ?? "").split(/\s+/);
  const mots: string[] = [];
  bruts.forEach((mot) => {
    if (cut) {
      mots.push(mot.length > n ? mot.slice(0, Math.max(1, n - 1)) + "…" : mot);
      return;
    }
    let reste = mot;
    while (reste.length > n) {
      mots.push(reste.slice(0, n - 1) + "-");
      reste = reste.slice(n - 1);
    }
    if (reste) mots.push(reste);
  });
  const lignes: string[] = [];
  let courante = "";
  mots.forEach((mot) => {
    if ((courante + " " + mot).trim().length > n) {
      if (courante) lignes.push(courante.trim());
      courante = mot;
    } else courante += " " + mot;
  });
  if (courante.trim()) lignes.push(courante.trim());
  if (lignes.length > max) {
    const gardees = lignes.slice(0, max);
    // Comme l'historique : sans ligne permise (max à 0), la dernière ligne n'existe pas et la coupe échoue.
    gardees[max - 1] = (gardees[max - 1] as string).slice(0, Math.max(1, n - 1)) + "…";
    return gardees;
  }
  return lignes;
}

/**
 * Coupe un texte pour qu'il tienne dans une boîte de largeur `box`, en
 * police de taille `size` et interligne `lh` : environ 0,55 × taille par
 * caractère, au plus `maxl` lignes (sinon autant que la hauteur en permet).
 */
export function fitN(texte: unknown, size: number, lh: number, box: number, maxl?: number): string[] {
  const n = Math.max(3, Math.round(box / (size * 0.55)));
  const max = maxl || Math.max(1, Math.floor(box / lh));
  return wrapN(texte, n, max, true);
}
