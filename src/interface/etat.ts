// SPDX-License-Identifier: CECILL-2.1
/**
 * État de l'interface : données de l'établissement, référentiel affiché,
 * évaluation en cours, liste des évaluations, promotions, modules,
 * préférences et état d'affichage.
 *
 * Le temps de la reprise du fichier historique (décision 38), il est tenu ici
 * et publié sur la fenêtre sous les noms que ce fichier emploie (`DATA`, `F`…),
 * par des accesseurs : lire ou réaffecter `DATA` dans le fichier historique
 * lit ou réaffecte `etat.donnees`. Les modules TypeScript qui reprennent ses
 * fonctions lisent le même état, sans copie.
 */

export type Objet = Record<string, unknown>;

export interface EtatInterface {
  /** Données de l'établissement (`DATA`), voir `domaine/modele-donnees`. */
  donnees: Objet;
  /** Référentiel actif tel que l'interface le lit (`REF`). */
  referentiel: Objet;
  /** Évaluation en cours d'édition (`F`). */
  evaluation: Objet;
  /** Évaluations enregistrées (`fiches`). */
  evaluations: Objet[];
  /** Promotions (`promos`). */
  promotions: Objet[];
  /** Modules actifs (`MOD`). */
  modules: Record<string, boolean>;
  /** Préférences de l'enseignant (`PREFS`). */
  preferences: Objet;
  /** État d'affichage : onglet, étape, filtres… (`ui`). */
  ui: Objet;
  /** Élément dont la suppression attend un second clic (`edArm`), ou `null`. */
  armement: unknown;
}

/** Nom employé par le fichier historique pour chaque partie de l'état. */
export const NOMS_HISTORIQUES: Readonly<Record<string, keyof EtatInterface>> = {
  DATA: "donnees",
  REF: "referentiel",
  F: "evaluation",
  fiches: "evaluations",
  promos: "promotions",
  MOD: "modules",
  PREFS: "preferences",
  ui: "ui",
  edArm: "armement",
};

/** État vide, rempli par le fichier historique à son chargement. */
export function etatVide(): EtatInterface {
  return { donnees: {}, referentiel: {}, evaluation: {}, evaluations: [], promotions: [], modules: {}, preferences: {}, ui: {}, armement: null };
}

/** L'état de l'application, unique. */
export const etat: EtatInterface = etatVide();

/**
 * Publie l'état sur `cible` (la fenêtre) sous les noms historiques, par des
 * accesseurs. À appeler avant le chargement du fichier historique, qui ne
 * déclare plus ces variables mais les affecte.
 */
export function publierEtat(cible: object, source: EtatInterface): void {
  for (const [nom, champ] of Object.entries(NOMS_HISTORIQUES)) {
    Object.defineProperty(cible, nom, {
      configurable: true,
      enumerable: false,
      get: () => source[champ],
      set: (valeur: never) => {
        source[champ] = valeur;
      },
    });
  }
}
