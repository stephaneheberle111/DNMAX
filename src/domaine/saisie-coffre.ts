// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Longueur minimale d'un mot de passe, en caractères.
 *
 * L'enveloppe applique la même règle et fait autorité ; la vérifier ici évite
 * seulement un aller-retour pour prévenir l'enseignant.
 */
export const LONGUEUR_MINIMALE_MOT_DE_PASSE = 8;

/**
 * Longueur minimale exigée quand le module Élèves est actif : les données
 * d'élèves sont des données personnelles, que seul le mot de passe protège
 * (voir DECISIONS.md, décision 27). Cette règle est
 * appliquée par l'interface seulement ; l'enveloppe ne connaît pas les modules.
 */
export const LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES = 12;

export type DefautMotDePasse = "trop-court" | "confirmation-differente";

/** Longueur minimale d'un mot de passe selon que le module Élèves est actif ou non. */
export function longueurMinimaleExigee(moduleEleves: boolean): number {
  return moduleEleves ? LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES : LONGUEUR_MINIMALE_MOT_DE_PASSE;
}

/** Vrai si `motDePasse` compte au moins `longueurMinimale` caractères. */
export function estAssezLong(motDePasse: string, longueurMinimale: number): boolean {
  // Compter les caractères et non les unités UTF-16 : un émoji vaut un caractère, comme côté enveloppe.
  return Array.from(motDePasse).length >= longueurMinimale;
}

/** Vérifie un nouveau mot de passe et sa confirmation ; rend `null` s'ils conviennent. */
export function verifierNouveauMotDePasse(
  motDePasse: string,
  confirmation: string,
  longueurMinimale: number = LONGUEUR_MINIMALE_MOT_DE_PASSE,
): DefautMotDePasse | null {
  if (!estAssezLong(motDePasse, longueurMinimale)) {
    return "trop-court";
  }
  if (motDePasse !== confirmation) {
    return "confirmation-differente";
  }
  return null;
}

/**
 * Vérifie qu'une valeur reçue de l'extérieur est bien un jeu d'entrées
 * (un texte par clé) avant de la confier à l'interface.
 */
export function estJeuEntrees(valeur: unknown): valeur is Record<string, string> {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) {
    return false;
  }
  return Object.values(valeur).every((contenu) => typeof contenu === "string");
}
