// SPDX-License-Identifier: AGPL-3.0-or-later
import { analyserJson, estObjet, lireEvaluations } from "./modele";
import { ontMemeModele } from "./modele-evaluation";

/** Clé du magasin où sont tenues les dates de dernière modification. */
export const CLE_DATES_MODIFICATION = "dnmax.modifications";

/** Date de dernière modification (ISO 8601) de chaque évaluation, par identifiant. */
export type DatesModification = Readonly<Record<string, string>>;

export function lireDatesModification(texte: string | null | undefined): DatesModification {
  const valeur = analyserJson(texte);
  if (!estObjet(valeur)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(valeur).filter((entree): entree is [string, string] => typeof entree[1] === "string"),
  );
}

/**
 * Met à jour les dates de dernière modification après un changement de la
 * liste des évaluations.
 *
 * Une évaluation nouvelle, ou dont le modèle a changé, reçoit `maintenant`.
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
): DatesModification | null {
  if (evaluationsAvant === evaluationsApres) {
    return null;
  }
  const avant = new Map(lireEvaluations(evaluationsAvant).map((evaluation) => [evaluation.id, evaluation]));
  const aJour: Record<string, string> = {};
  let changement = false;
  for (const evaluation of lireEvaluations(evaluationsApres)) {
    const precedente = avant.get(evaluation.id);
    const dateConnue = dates[evaluation.id];
    if (precedente !== undefined && ontMemeModele(precedente, evaluation)) {
      if (dateConnue !== undefined) {
        aJour[evaluation.id] = dateConnue;
      }
    } else {
      aJour[evaluation.id] = maintenant.toISOString();
      changement = true;
    }
  }
  const datesRetirees = Object.keys(dates).some((identifiant) => !(identifiant in aJour));
  return changement || datesRetirees ? aJour : null;
}
