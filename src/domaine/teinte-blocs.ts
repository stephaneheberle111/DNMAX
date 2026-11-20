// SPDX-License-Identifier: CECILL-2.1
/*
 * Teinte des lignes « Bloc » dans les tableaux du référentiel (Planification,
 * compétences × semestres, Recherche). La feuille de styles la mêle au papier :
 * c'est une couleur soutenue, qui s'affiche plus pâle. Calculs seuls.
 */

/** Pétrole de l'identité, éclairci : mêlé au papier, il donne le pétrole pâle des pastilles de l'application. */
export const TEINTE_BLOCS = "#B9D6D8";

/**
 * Vert d'eau des versions jusqu'à la 1.0.0, enregistré tel quel dans chaque
 * référentiel alors que rien ne permettait de le choisir.
 */
const TEINTE_BLOCS_D_ORIGINE = "#D1F1DA";

/**
 * Teinte à afficher pour un référentiel : celle qu'il porte, sauf si elle est
 * absente ou si c'est le vert d'eau d'origine, que la teinte de l'identité
 * remplace. Une autre couleur, venue d'un fichier reçu, est respectée.
 */
export function teinteBlocsAffichee(enregistree: unknown): string {
  if (typeof enregistree !== "string" || enregistree.trim() === "") {
    return TEINTE_BLOCS;
  }
  return enregistree.trim().toUpperCase() === TEINTE_BLOCS_D_ORIGINE ? TEINTE_BLOCS : enregistree;
}
