// SPDX-License-Identifier: AGPL-3.0-or-later

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/**
 * Écrit une date en toutes lettres, comme sur un courrier : « 13 novembre 2026 »,
 * « 1er mars 2027 ». Le jour est celui du fuseau de l'ordinateur, celui que
 * l'enseignant lit sur son calendrier.
 *
 * Écrit à la main plutôt qu'avec `Intl` : le résultat ne dépend pas des
 * données de langue de la vue web, et le premier du mois prend « 1er ».
 *
 * @returns une chaîne vide pour une date invalide.
 */
export function ecrireDateLongue(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const jour = date.getDate();
  const mois = MOIS[date.getMonth()] ?? "";
  return `${jour === 1 ? "1er" : String(jour)} ${mois} ${String(date.getFullYear())}`;
}
