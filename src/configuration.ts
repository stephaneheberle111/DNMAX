// SPDX-License-Identifier: CECILL-2.1

/**
 * Adresses publiques du projet. L'application ne s'y connecte pas d'elle-même :
 * elle les ouvre dans le navigateur de l'enseignant, à sa demande.
 * Toute adresse ajoutée ici doit aussi être autorisée dans `src-tauri/capabilities/default.json`.
 */
export const ADRESSE_SITE = "https://dnmax.fr/";
export const ADRESSE_RETOURS = "https://dnmax.fr/#idees";
export const ADRESSE_CODE_SOURCE = "https://github.com/stephaneheberle111/DNMAX";

/** Nom de la licence tel que l'enseignant le lit (identifiant SPDX : `CECILL-2.1`, texte dans `LICENSE`). */
export const LICENCE = "CeCILL v2.1";

/**
 * Années pendant lesquelles les données d'étudiants d'une promotion sont gardées
 * après sa sortie (fin de l'année scolaire où s'achève son diplôme). Au-delà,
 * DNMAX propose de les effacer. Voir DECISIONS.md, « Durée de conservation ».
 */
export const ANNEES_CONSERVATION_ELEVES = 1;

/**
 * Verrouillage après inactivité, quand le module Étudiants est actif : au-delà de
 * ce délai sans action de l'enseignant (souris, clavier), les données quittent
 * la mémoire et le mot de passe est redemandé. Voir DECISIONS.md, décision 27.
 */
export const DELAI_VERROUILLAGE_INACTIVITE_MS = 15 * 60_000;

/** Fréquence à laquelle l'inactivité est contrôlée, en millisecondes. */
export const INTERVALLE_CONTROLE_INACTIVITE_MS = 15_000;
