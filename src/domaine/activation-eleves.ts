// SPDX-License-Identifier: CECILL-2.1
/**
 * Activation du module Étudiants : ce que DNMAX décide du mot de passe
 * saisi dans la boîte d'activation. Calculs seuls ; la vérification du mot
 * de passe actuel et son changement passent par l'enveloppe de bureau.
 */
import { defautsRobustesse, expliquerDefauts } from "./robustesse-mot-de-passe";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE, LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES, verifierNouveauMotDePasse } from "./saisie-coffre";

/**
 * Suite à donner une fois le mot de passe actuel vérifié : activer le module
 * s'il répond déjà aux exigences du module, sinon en faire choisir un plus solide.
 */
export function suiteApresMotDePasseActuel(motDePasse: string, motsInterdits: readonly string[]): "activer" | "choisir-nouveau" {
  return defautsRobustesse(motDePasse, motsInterdits).length === 0 ? "activer" : "choisir-nouveau";
}

/** Raison de refuser le nouveau mot de passe et sa confirmation, à dire à l'enseignant ; `null` s'ils conviennent. */
export function refusNouveauMotDePasse(nouveau: string, confirmation: string, motsInterdits: readonly string[]): string | null {
  const defaut = verifierNouveauMotDePasse(nouveau, confirmation, LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES);
  if (defaut === "trop-court") {
    return `Le nouveau mot de passe doit compter au moins ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)} caractères.`;
  }
  if (defaut !== null) {
    return "Les deux saisies du nouveau mot de passe ne sont pas identiques.";
  }
  const defauts = defautsRobustesse(nouveau, motsInterdits);
  return defauts.length > 0 ? expliquerDefauts(defauts) : null;
}

/**
 * Raison de refuser un mot de passe choisi dans « Mon compte », changement
 * simple ou renouvellement complet ; `null` s'il convient.
 *
 * Avec le module Étudiant·es actif, les règles sont exactement celles de
 * l'activation (longueur, types de caractères, pas de suite ni de mot
 * évident) : sans cela, il suffirait de changer de mot de passe après
 * l'activation pour revenir à un mot de passe faible jusqu'à l'ouverture suivante.
 */
export function refusChangementMotDePasse(
  nouveau: string,
  confirmation: string,
  moduleEleves: boolean,
  motsInterdits: readonly string[],
): string | null {
  if (moduleEleves) {
    return refusNouveauMotDePasse(nouveau, confirmation, motsInterdits);
  }
  const defaut = verifierNouveauMotDePasse(nouveau, confirmation, LONGUEUR_MINIMALE_MOT_DE_PASSE);
  if (defaut === "trop-court") {
    return `Le nouveau mot de passe doit compter au moins ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE)} caractères.`;
  }
  return defaut === null ? null : "Les deux saisies du nouveau mot de passe ne sont pas identiques.";
}
