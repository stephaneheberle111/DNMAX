// SPDX-License-Identifier: AGPL-3.0-or-later
import { analyserJson, estObjet, lireEvaluations } from "./modele";
import { ontMemeModele } from "./modele-evaluation";

/** Clé du magasin où sont tenues les dates de dernière modification. */
export const CLE_DATES_MODIFICATION = "dnmax.modifications";

/** Dernière modification d'une évaluation : quand, et par quel enseignant. */
export interface Modification {
  /** Date ISO 8601, ou texte vide si elle est inconnue. */
  le: string;
  /** Nom de l'enseignant, ou texte vide s'il est inconnu. */
  par: string;
}

/** Dernière modification de chaque évaluation, par identifiant. */
export type DatesModification = Readonly<Record<string, Modification>>;

/** Modification dont on ne sait rien : évaluation antérieure au suivi. */
export const MODIFICATION_INCONNUE: Modification = { le: "", par: "" };

function lireModification(valeur: unknown): Modification | null {
  // Premier format enregistré : la date seule, sans auteur.
  if (typeof valeur === "string") {
    return { le: valeur, par: "" };
  }
  if (estObjet(valeur) && typeof valeur.le === "string") {
    return { le: valeur.le, par: typeof valeur.par === "string" ? valeur.par : "" };
  }
  return null;
}

export function lireDatesModification(texte: string | null | undefined): DatesModification {
  const valeur = analyserJson(texte);
  if (!estObjet(valeur)) {
    return {};
  }
  const modifications: Record<string, Modification> = {};
  for (const [identifiant, contenu] of Object.entries(valeur)) {
    const modification = lireModification(contenu);
    if (modification !== null) {
      modifications[identifiant] = modification;
    }
  }
  return modifications;
}

/**
 * Met à jour les dates de dernière modification après un changement de la
 * liste des évaluations.
 *
 * Une évaluation nouvelle, ou dont le modèle a changé, reçoit `maintenant` et `auteur`.
 * Saisir des résultats d'élèves ou faire avancer le suivi ne change pas la
 * date : elle décrit le modèle, c'est-à-dire ce qui s'échange. Les dates des
 * évaluations supprimées sont retirées.
 *
 * Rend `null` quand rien n'est à modifier.
 */
export function mettreAJourDates(
  evaluationsAvant: string | null | undefined,
  evaluationsApres: string | null | undefined,
  dates: DatesModification,
  maintenant: Date,
  auteur: string,
): DatesModification | null {
  if (evaluationsAvant === evaluationsApres) {
    return null;
  }
  const avant = new Map(lireEvaluations(evaluationsAvant).map((evaluation) => [evaluation.id, evaluation]));
  const aJour: Record<string, Modification> = {};
  let changement = false;
  for (const evaluation of lireEvaluations(evaluationsApres)) {
    const precedente = avant.get(evaluation.id);
    const dateConnue = dates[evaluation.id];
    if (precedente !== undefined && ontMemeModele(precedente, evaluation)) {
      if (dateConnue !== undefined) {
        aJour[evaluation.id] = dateConnue;
      }
    } else {
      aJour[evaluation.id] = { le: maintenant.toISOString(), par: auteur };
      changement = true;
    }
  }
  const datesRetirees = Object.keys(dates).some((identifiant) => !(identifiant in aJour));
  return changement || datesRetirees ? aJour : null;
}
