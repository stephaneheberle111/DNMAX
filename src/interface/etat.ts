// SPDX-License-Identifier: CECILL-2.1
/**
 * État de l'interface : données de l'établissement, référentiel affiché,
 * évaluation en cours, liste des évaluations, promotions, modules,
 * préférences et état d'affichage.
 *
 * Les modules de `interface/` le lisent et le modifient directement. Il est
 * aussi publié sur la fenêtre sous les noms de l'ancien script (`DATA`, `F`…,
 * décision 38), par des accesseurs, pour le banc de comparaison
 * (`outils/banc/`) : lire ou réaffecter `DATA` dans la page lit ou réaffecte
 * `etat.donnees`.
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
  /**
   * Teinte des blocs de compétences (`BLOC_TINT`), relevée une fois au
   * chargement dans le référentiel affiché ; vide avant.
   */
  teinteBlocs: string;
}

/** Nom employé par l'ancien script pour chaque partie de l'état. */
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
  BLOC_TINT: "teinteBlocs",
};

/** État vide, rempli au démarrage de l'interface (`interface/demarrage`). */
export function etatVide(): EtatInterface {
  return { donnees: {}, referentiel: {}, evaluation: {}, evaluations: [], promotions: [], modules: {}, preferences: {}, ui: {}, armement: null, teinteBlocs: "" };
}

/** L'état de l'application, unique. */
export const etat: EtatInterface = etatVide();

/**
 * Publie l'état sur `cible` (la fenêtre) sous les noms de l'ancien script,
 * par des accesseurs.
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
