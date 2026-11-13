// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Adresses publiques du projet. L'application ne s'y connecte pas d'elle-même :
 * elle les ouvre dans le navigateur de l'enseignant, à sa demande.
 * Toute adresse ajoutée ici doit aussi être autorisée dans `src-tauri/capabilities/default.json`.
 */
export const ADRESSE_SITE = "https://dnmax.fr/";
export const ADRESSE_RETOURS = "https://dnmax.fr/#idees";
export const ADRESSE_CODE_SOURCE = "https://github.com/stephaneheberle111/DNMAX";
export const ADRESSE_CONFIDENTIALITE = "https://dnmax.fr/#confidentialite";


export const LICENCE = "AGPL-3.0-or-later";

/** Délais de l'échange en direct, en millisecondes. */
export const DELAIS_ECHANGE_DIRECT = {
  /** Recherche des adresses locales avant d'écrire un code ; au-delà, le code part avec celles trouvées. */
  rassemblement: 10_000,
  /** Attente de l'autre enseignant : le temps de se transmettre les codes à la main. */
  attenteCorrespondant: 15 * 60_000,
  /** Établissement de la connexion, une fois les deux codes connus de chaque côté. */
  connexion: 30_000,
  /** Silence admis pendant un transfert avant de le déclarer interrompu. */
  inactivite: 60_000,
} as const;

/**
 * Taille maximale d'un paquet reçu en direct, en unités UTF-16 : même ordre que
 * la limite d'un fichier d'échange (20 Mo, `TAILLE_MAXIMALE_ECHANGE` côté enveloppe).
 */
export const TAILLE_MAXIMALE_ECHANGE_DIRECT = 20 * 1024 * 1024;

/**
 * Années pendant lesquelles les données d'élèves d'une promotion sont gardées
 * après sa sortie (fin de l'année scolaire où s'achève son diplôme). Au-delà,
 * DNMAX propose de les effacer. Voir DECISIONS.md, « Durée de conservation ».
 */
export const ANNEES_CONSERVATION_ELEVES = 1;

/**
 * Verrouillage après inactivité, quand le module Élèves est actif : au-delà de
 * ce délai sans action de l'enseignant (souris, clavier), les données quittent
 * la mémoire et le mot de passe est redemandé. Voir DECISIONS.md, décision 25.
 */
export const DELAI_VERROUILLAGE_INACTIVITE_MS = 15 * 60_000;

/** Fréquence à laquelle l'inactivité est contrôlée, en millisecondes. */
export const INTERVALLE_CONTROLE_INACTIVITE_MS = 15_000;
