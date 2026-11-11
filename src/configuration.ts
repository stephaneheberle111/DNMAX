// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Adresses publiques du projet. L'application ne s'y connecte pas d'elle-même :
 * elle les ouvre dans le navigateur de l'enseignant, à sa demande.
 * Toute adresse ajoutée ici doit aussi être autorisée dans `src-tauri/capabilities/default.json`.
 */
export const ADRESSE_SITE = "https://dnmax.pages.dev/";
export const ADRESSE_RETOURS = "https://dnmax.pages.dev/#idees";
export const ADRESSE_CODE_SOURCE = "https://github.com/stephaneheberle111/DNMAX";

/** Référentiel proposé aux installations neuves, à télécharger puis à recevoir par « Échanger… ». */
export const REFERENTIEL_PROPOSE = {
  nom: "DN MADE mention Objet",
  adresse: "https://github.com/stephaneheberle111/DNMAX/raw/main/site/referentiels/dn-made-objet.dnmax",
} as const;

export const LICENCE = "AGPL-3.0-or-later";
