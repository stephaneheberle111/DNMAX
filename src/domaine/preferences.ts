// SPDX-License-Identifier: CECILL-2.1
/**
 * Préférences de l'enseignant (menu « Mon compte ») : le nom du champ
 * d'évaluation et le sceau DN MADE en tête des documents.
 */

/** Noms proposés pour le champ d'évaluation. */
export const LIBELLES_PROPOSES: readonly string[] = ["Critère observable", "Critère opérationnel", "Compétence opérationnelle", "Attendu", "Indicateur de réussite"];

const LIBELLE_PAR_DEFAUT = "Compétence opérationnelle";

/** Préférences enregistrées (champs absents tolérés). */
export interface Preferences {
  critLabel?: unknown;
  sceau?: unknown;
}

/** Préférences au premier lancement, complétées par celles enregistrées. */
export function preferencesInitiales(enregistrees: Preferences): Preferences {
  return { critLabel: LIBELLE_PAR_DEFAUT, ...enregistrees };
}

/** Nom du champ d'évaluation ; le nom par défaut s'il est vide. */
export function libelleCritere(preferences: Preferences): string {
  const libelle = typeof preferences.critLabel === "string" && preferences.critLabel !== "" ? preferences.critLabel : LIBELLE_PAR_DEFAUT;
  return libelle.trim() || LIBELLE_PAR_DEFAUT;
}

/** Vrai si le sceau DN MADE est demandé (jamais par défaut). */
export function sceauActif(preferences: Preferences): boolean {
  return preferences.sceau === true;
}
