// SPDX-License-Identifier: CECILL-2.1

/**
 * Suivi simplifié (Paramètres > Règles d'évaluation, décision 36) : pour qui
 * compose la fiche, l'imprime et la distribue, deux étapes suffisent. Ce n'est
 * qu'un affichage : le statut détaillé reste calculé et enregistré comme
 * d'habitude, et un collègue en suivi complet, ou l'enseignant qui y revient,
 * en retrouve tout le détail.
 */

export type StatutSimplifie = "brouillon" | "a-faire" | "faite" | "annulee";

/** Statut détaillé (`prep`, `distrib`, `rendu`, `evalcours`, `eval`, `restpart`, `restit`…) vers son équivalent simplifié. */
export function statutSimplifie(statut: string): StatutSimplifie {
  switch (statut) {
    case "brouillon":
    case "annulee":
      return statut;
    case "prep":
      return "a-faire";
    default:
      return "faite";
  }
}

export const LIBELLES_SIMPLIFIES: Readonly<Record<StatutSimplifie, string>> = {
  brouillon: "Brouillon",
  "a-faire": "À faire",
  faite: "Faite",
  annulee: "Annulée",
};

/**
 * Ce que fait le bouton du suivi simplifié : « Faite » marque la fiche
 * distribuée aujourd'hui ; « À faire » retire cette marque, seulement si
 * l'évaluation n'est pas allée plus loin que la distribution.
 */
export function actionSimplifiee(statut: string): "marquer-faite" | "remettre-a-faire" | null {
  if (statut === "prep") {
    return "marquer-faite";
  }
  return statut === "distrib" ? "remettre-a-faire" : null;
}
