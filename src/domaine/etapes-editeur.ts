// SPDX-License-Identifier: CECILL-2.1
/**
 * La barre des étapes de l'éditeur d'évaluation : quelles étapes sont
 * ouvertes, et ce que chacune résume. Calculs seuls.
 */
import { lignesDe } from "./evaluation";

/**
 * Dernière étape accessible. L'évaluation des étudiants (étape 4) n'existe
 * qu'avec le module Étudiants, et un brouillon ne s'évalue pas (décision 29).
 */
export function derniereEtape(situation: { moduleEleves: boolean; brouillon: boolean }): 3 | 4 {
  return situation.moduleEleves && !situation.brouillon ? 4 : 3;
}

/** Étape à afficher : celle demandée, ramenée entre 1 et la dernière accessible. */
export function etapeAffichee(demandee: number, derniere: number): number {
  return Math.min(derniere, Math.max(1, Math.trunc(demandee) || 1));
}

/** Compteurs résumés sous les trois premières étapes. */
export interface ResumeEtapes {
  readonly livrables: number;
  readonly retenues: number;
  readonly lignes: number;
  readonly regroupements: number;
  /** Lignes formulées. Un regroupement compte toujours comme formulé (comportement repris de l'interface historique). */
  readonly formulees: number;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

export function resumeEtapes(brut: unknown): ResumeEtapes {
  const evaluation = estObjet(brut) ? brut : {};
  const lignes = lignesDe(evaluation);
  const regroupements = lignes.filter((ligne) => ligne.regroupement !== null).length;
  const seulesFormulees = lignes.filter((ligne) => ligne.regroupement === null && ligne.competence.libelle !== "").length;
  return {
    livrables: Array.isArray(evaluation.livrables) ? evaluation.livrables.length : 0,
    retenues: Array.isArray(evaluation.items) ? evaluation.items.length : 0,
    lignes: lignes.length,
    regroupements,
    formulees: regroupements + seulesFormulees,
  };
}
