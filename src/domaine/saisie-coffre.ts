// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Longueur minimale d'un mot de passe, en caractères.
 *
 * L'enveloppe applique la même règle et fait autorité ; la vérifier ici évite
 * seulement un aller-retour pour prévenir l'enseignant.
 */
export const LONGUEUR_MINIMALE_MOT_DE_PASSE = 8;

export type DefautMotDePasse = "trop-court" | "confirmation-differente";

/** Vérifie un nouveau mot de passe et sa confirmation ; rend `null` s'ils conviennent. */
export function verifierNouveauMotDePasse(motDePasse: string, confirmation: string): DefautMotDePasse | null {
  // Compter les caractères et non les unités UTF-16 : un émoji vaut un caractère, comme côté enveloppe.
  if (Array.from(motDePasse).length < LONGUEUR_MINIMALE_MOT_DE_PASSE) {
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
