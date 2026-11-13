// SPDX-License-Identifier: AGPL-3.0-or-later
import { ecrireJsonCanonique } from "../empreinte";
import type { Evaluation, ObjetJson } from "./modele";

/**
 * Champs propres à l'enseignant et à ses étudiants : ils ne quittent jamais
 * l'ordinateur et ne comptent pas comme une modification de l'évaluation.
 *
 * - `res`, `eleves`, `eleveIds`, `eleveId`, `restit` : étudiants et résultats ;
 * - `suivi`, `date` : avancement et date de saisie chez cet enseignant ;
 * - `promoId`, `refV` : identifiants locaux, sans valeur sur un autre poste ;
 * - `brouillon` : état de la saisie chez cet enseignant (décision 29).
 */
export const CHAMPS_LOCAUX = [
  "res",
  "eleves",
  "eleveIds",
  "eleveId",
  "restit",
  "suivi",
  "date",
  "promoId",
  "refV",
  "brouillon",
] as const;

/** Le modèle d'une évaluation : ce qui peut être partagé avec un autre enseignant. */
export function extraireModele(evaluation: Evaluation): Evaluation {
  const modele: ObjetJson = { ...evaluation };
  for (const champ of CHAMPS_LOCAUX) {
    // Suppression d'une clé connue à l'avance, sur une copie : aucun risque d'effet de bord.
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete modele[champ];
  }
  return { ...modele, id: evaluation.id };
}

/** Indique si deux évaluations ont le même modèle, étudiants et suivi mis à part. */
export function ontMemeModele(premiere: Evaluation, seconde: Evaluation): boolean {
  return ecrireJsonCanonique(extraireModele(premiere)) === ecrireJsonCanonique(extraireModele(seconde));
}

/**
 * Applique un modèle reçu à une évaluation déjà présente : le modèle est
 * remplacé, les étudiants, résultats et suivi de l'enseignant sont conservés.
 */
export function remplacerModele(locale: Evaluation, modeleRecu: Evaluation): Evaluation {
  const fusion: ObjetJson = { ...extraireModele(modeleRecu) };
  for (const champ of CHAMPS_LOCAUX) {
    if (champ in locale) {
      fusion[champ] = locale[champ];
    }
  }
  return { ...fusion, id: locale.id };
}

/** Libellés lisibles des champs d'une évaluation, pour décrire ce qui a changé. */
const LIBELLES_CHAMPS: Readonly<Record<string, string>> = {
  titre: "Intitulé",
  consignes: "Consignes",
  livrables: "Livrables",
  items: "Compétences et critères",
  semestre: "Semestre",
  classes: "Promotions",
  classe: "Promotions",
  prof: "Enseignant·es",
  profs: "Enseignant·es",
  ues: "Unités d'enseignement",
  ecCodes: "Enseignements constitutifs",
  preset: "Échelle",
  niveaux: "Échelle",
  distribPrev: "Date de distribution",
  renduPrev: "Date de rendu",
  opts: "Options d'affichage",
};

const LIBELLE_AUTRE = "Autres réglages";

/** Liste, sans doublon, les rubriques qui diffèrent entre deux évaluations. */
export function listerRubriquesModifiees(locale: Evaluation, recue: Evaluation): string[] {
  const modeleLocal = extraireModele(locale);
  const modeleRecu = extraireModele(recue);
  const champs = new Set([...Object.keys(modeleLocal), ...Object.keys(modeleRecu)]);
  const rubriques = new Set<string>();
  for (const champ of champs) {
    if (ecrireJsonCanonique(modeleLocal[champ]) !== ecrireJsonCanonique(modeleRecu[champ])) {
      rubriques.add(LIBELLES_CHAMPS[champ] ?? LIBELLE_AUTRE);
    }
  }
  return [...rubriques].sort((a, b) => a.localeCompare(b, "fr"));
}
