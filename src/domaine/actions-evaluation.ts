// SPDX-License-Identifier: CECILL-2.1
/**
 * Mes évaluations : les actions de suivi proposées dans la fenêtre des
 * actions d'une évaluation (terminer ou rouvrir, restituer, annuler,
 * rétablir, supprimer les évaluations individuelles). Règles reprises telles
 * quelles de l'interface historique.
 */

type Evaluation = Record<string, unknown>;

export type ActionSuivi =
  | { sorte: "retab" }
  | { sorte: "delres"; individuelles: number; armee: boolean }
  | { sorte: "aucune-individuelle" }
  | { sorte: "sep" }
  | { sorte: "fin"; libelle: string }
  | { sorte: "fin-saisie"; full: number; tot: number }
  | { sorte: "fin-bloquee"; manquants: number }
  | { sorte: "rest"; promotion: string; restituee: boolean; plusieurs: boolean }
  | { sorte: "annul" };

/** Ce que les actions demandent de savoir de l'évaluation. */
export interface SituationActions {
  readonly moduleEleves: boolean;
  readonly saisie: { readonly any: number; readonly full: number; readonly tot: number };
  readonly rendusManquants: number;
  /** Étudiants qui ont une évaluation individuelle enregistrée. */
  readonly individuelles: number;
  /** La suppression des évaluations individuelles attend-elle sa confirmation ? */
  readonly armee: boolean;
  /** Promotions visées par l'évaluation. */
  readonly promotions: readonly string[];
}

function objet(valeur: unknown): Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null ? (valeur as Record<string, unknown>) : {};
}

/** Actions de suivi d'une évaluation, dans l'ordre où elles s'affichent. */
export function actionsSuivi(evaluation: Evaluation, situation: SituationActions): ActionSuivi[] {
  if (evaluation.annulee) {
    return [
      { sorte: "retab" },
      situation.individuelles > 0 ? { sorte: "delres", individuelles: situation.individuelles, armee: situation.armee } : { sorte: "aucune-individuelle" },
    ];
  }
  const suivi = objet(evaluation.suivi);
  const restituees = objet(evaluation.restit);
  const actions: ActionSuivi[] = [{ sorte: "sep" }];
  if (!situation.moduleEleves) actions.push({ sorte: "fin", libelle: suivi.evalue ? "Rouvrir l'évaluation" : "Marquer l'évaluation terminée" });
  else if (suivi.evalue) actions.push({ sorte: "fin", libelle: "Rouvrir l'évaluation" });
  else if (situation.saisie.any && situation.saisie.full < situation.saisie.tot) {
    actions.push(
      situation.rendusManquants > 0
        ? { sorte: "fin-bloquee", manquants: situation.rendusManquants }
        : { sorte: "fin-saisie", full: situation.saisie.full, tot: situation.saisie.tot },
    );
  }
  for (const promotion of situation.promotions) {
    actions.push({ sorte: "rest", promotion, restituee: Boolean(restituees[promotion]), plusieurs: situation.promotions.length > 1 });
  }
  actions.push({ sorte: "sep" }, { sorte: "annul" });
  return actions;
}

/**
 * Termine l'évaluation à la date du jour, ou la rouvre si elle l'était.
 *
 * @param mode « dnmax » avec le module Étudiants, « main » sinon
 * @returns faux si un rendu manque encore : rien n'est changé
 */
export function terminerOuRouvrir(suivi: Record<string, unknown>, rendusManquants: number, mode: string, aujourdhui: string): boolean {
  if (suivi.evalue) {
    Reflect.deleteProperty(suivi, "evalue");
    Reflect.deleteProperty(suivi, "mode");
    return true;
  }
  if (rendusManquants > 0) return false;
  suivi.evalue = aujourdhui;
  suivi.mode = mode;
  return true;
}

/** Marque la promotion restituée à la date du jour, ou annule sa restitution. */
export function basculerRestitution(evaluation: Evaluation, promotion: string, aujourdhui: string): void {
  const restituees = objet(evaluation.restit);
  evaluation.restit = restituees;
  if (restituees[promotion]) Reflect.deleteProperty(restituees, promotion);
  else restituees[promotion] = aujourdhui;
}
