// SPDX-License-Identifier: CECILL-2.1
/**
 * Ordre des cases dans les colonnes de la carte heuristique, pour réduire
 * les croisements de liens : chaque colonne se range au barycentre des
 * rangs de ses voisins reliés dans la colonne d'à côté, de proche en proche
 * (balayages aller puis retour, le meilleur retenu), puis deux cases
 * voisines s'échangent tant que cela retire des croisements. Calcul pur,
 * sans accès à l'état ni à la page ; déterministe, les égalités gardant
 * l'ordre d'origine.
 */

/** Vrai si la case `gauche` de la colonne `rang` est reliée à la case `droite` de la colonne `rang + 1`. */
export type Relie = (rang: number, gauche: string, droite: string) => boolean;

/**
 * Nombre d'allers-retours au barycentre, puis de passes d'échanges au plus :
 * sur des colonnes de quelques dizaines de cases, le gain est nul au-delà.
 */
const BALAYAGES_MAX = 8;
const ECHANGES_MAX = 20;

/** Liens entre deux colonnes voisines, en rangs : pour chaque case de gauche, les rangs de ses voisines à droite. */
function liensEntre(gauche: readonly string[], droite: readonly string[], rang: number, relie: Relie): number[][] {
  return gauche.map((a) => droite.flatMap((b, j) => (relie(rang, a, b) ? [j] : [])));
}

/** Croisements entre deux colonnes voisines : paires de liens (a, b) et (a', b') avec a avant a' et b après b'. */
function croisementsEntre(liens: readonly (readonly number[])[]): number {
  const paires: [number, number][] = [];
  liens.forEach((voisines, i) => {
    for (const j of voisines) paires.push([i, j]);
  });
  let total = 0;
  for (let x = 0; x < paires.length; x++)
    for (let y = x + 1; y < paires.length; y++) {
      const [a, b] = paires[x] as [number, number];
      const [c, d] = paires[y] as [number, number];
      if ((a - c) * (b - d) < 0) total++;
    }
  return total;
}

/** Nombre total de croisements de liens entre colonnes voisines, pour l'ordre donné des cases. */
export function compterCroisements(colonnes: readonly (readonly string[])[], relie: Relie): number {
  let total = 0;
  for (let rang = 0; rang < colonnes.length - 1; rang++) total += croisementsEntre(liensEntre(colonnes[rang] ?? [], colonnes[rang + 1] ?? [], rang, relie));
  return total;
}

/**
 * Range `colonne` au barycentre des rangs de ses voisines reliées dans
 * `voisine`. Une case sans lien garde sa place ; les autres se partagent
 * les places restantes dans l'ordre de leur barycentre, l'ordre d'origine
 * départageant les égalités.
 */
function rangerAuBarycentre(colonne: readonly string[], voisines: readonly (readonly number[])[]): string[] {
  const reliees = colonne
    .map((id, rang) => ({ id, rang, voisines: voisines[rang] ?? [] }))
    .filter((c) => c.voisines.length > 0)
    .map((c) => ({ ...c, barycentre: c.voisines.reduce((somme, j) => somme + j, 0) / c.voisines.length }))
    .sort((a, b) => a.barycentre - b.barycentre || a.rang - b.rang);
  let suivante = 0;
  return colonne.map((id, rang) => ((voisines[rang] ?? []).length > 0 ? (reliees[suivante++] as { id: string }).id : id));
}

/** Pour chaque case de `colonne` (rang `rang`), les rangs de ses voisines reliées dans la colonne `rangVoisin`, voisine immédiate. */
function voisinesDans(colonnes: readonly (readonly string[])[], rang: number, rangVoisin: number, relie: Relie): number[][] {
  const colonne = colonnes[rang] ?? [];
  const voisine = colonnes[rangVoisin] ?? [];
  if (rangVoisin === rang + 1) return liensEntre(colonne, voisine, rang, relie);
  return colonne.map((b) => voisine.flatMap((a, i) => (relie(rangVoisin, a, b) ? [i] : [])));
}

/** Croisements entre les liens de deux cases d'une même colonne quand la première est avant la seconde, d'un côté. */
function croisementsDeuxCases(voisinesPremiere: readonly number[], voisinesSeconde: readonly number[]): number {
  let total = 0;
  for (const a of voisinesPremiere) for (const b of voisinesSeconde) if (a > b) total++;
  return total;
}

/**
 * Affinage après les balayages : échange deux cases voisines d'une colonne
 * mobile tant que l'échange retire des croisements (avec les deux colonnes
 * d'à côté). Un échange qui n'en retire pas strictement est refusé, ce qui
 * garantit l'arrêt.
 */
function affinerParEchanges(colonnes: string[][], relie: Relie, fixes: ReadonlySet<number>): void {
  for (let tour = 0; tour < ECHANGES_MAX; tour++) {
    let echange = false;
    for (let rang = 0; rang < colonnes.length; rang++) {
      if (fixes.has(rang)) continue;
      const colonne = colonnes[rang] as string[];
      const gauche = rang > 0 ? voisinesDans(colonnes, rang, rang - 1, relie) : colonne.map(() => []);
      const droite = rang < colonnes.length - 1 ? voisinesDans(colonnes, rang, rang + 1, relie) : colonne.map(() => []);
      for (let i = 0; i + 1 < colonne.length; i++) {
        const [g1, g2, d1, d2] = [gauche[i] ?? [], gauche[i + 1] ?? [], droite[i] ?? [], droite[i + 1] ?? []];
        const avant = croisementsDeuxCases(g1, g2) + croisementsDeuxCases(d1, d2);
        const apres = croisementsDeuxCases(g2, g1) + croisementsDeuxCases(d2, d1);
        if (apres >= avant) continue;
        [colonne[i], colonne[i + 1]] = [colonne[i + 1] as string, colonne[i] as string];
        [gauche[i], gauche[i + 1]] = [g2, g1];
        [droite[i], droite[i + 1]] = [d2, d1];
        echange = true;
      }
    }
    if (!echange) return;
  }
}

/**
 * Ordre des cases de chaque colonne qui réduit les croisements de liens :
 * balayages au barycentre, puis échanges de cases voisines. Les colonnes de
 * `fixes` (le pivot, les semestres, qui gardent leur ordre chronologique) ne
 * bougent pas. Le résultat n'a jamais plus de croisements que l'ordre
 * d'origine : s'il n'en retire aucun, l'ordre d'origine est rendu tel quel.
 */
export function ordonnerParBarycentre(colonnes: readonly (readonly string[])[], relie: Relie, fixes: ReadonlySet<number> = new Set()): string[][] {
  const origine = colonnes.map((colonne) => [...colonne]);
  const croisementsOrigine = compterCroisements(origine, relie);
  if (croisementsOrigine === 0) return origine;
  let meilleur = origine;
  let meilleurs = croisementsOrigine;
  const courant = origine.map((colonne) => [...colonne]);
  for (let tour = 0; tour < BALAYAGES_MAX; tour++) {
    for (let rang = 1; rang < courant.length; rang++)
      if (!fixes.has(rang)) courant[rang] = rangerAuBarycentre(courant[rang] ?? [], voisinesDans(courant, rang, rang - 1, relie));
    for (let rang = courant.length - 2; rang >= 0; rang--)
      if (!fixes.has(rang)) courant[rang] = rangerAuBarycentre(courant[rang] ?? [], voisinesDans(courant, rang, rang + 1, relie));
    const croisements = compterCroisements(courant, relie);
    if (croisements < meilleurs) {
      meilleurs = croisements;
      meilleur = courant.map((colonne) => [...colonne]);
    }
  }
  const affine = meilleur.map((colonne) => [...colonne]);
  affinerParEchanges(affine, relie, fixes);
  return compterCroisements(affine, relie) < croisementsOrigine ? affine : origine;
}
