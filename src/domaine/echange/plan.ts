// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entrees } from "../magasin-memoire";
import {
  CLE_DONNEES,
  CLE_EVALUATIONS,
  analyserJson,
  estEvaluation,
  lireDonneesEtablissement,
  type Evaluation,
} from "./modele";
import { listerRubriquesModifiees, ontMemeModele, remplacerModele } from "./modele-evaluation";
import type { EvaluationEchangee, Paquet } from "./paquet";
import { comparerBase, type ComparaisonBase } from "./referentiel";
import { CLE_DATES_MODIFICATION, lireDatesModification } from "./suivi-modifications";

export type Action = "creer" | "modifier" | "aucune";

/** Ce que l'import ferait d'une évaluation du fichier, s'il était appliqué. */
export interface LignePlan {
  identifiant: string;
  titre: string;
  action: Action;
  /** Date de dernière modification ici ; texte vide si l'évaluation est nouvelle ou la date inconnue. */
  modifieIciLe: string;
  /** Date de dernière modification dans le fichier ; texte vide si elle est inconnue. */
  modifieDansFichierLe: string;
  /** Rubriques qui changeraient (action « modifier » seulement). */
  rubriquesModifiees: string[];
  referentiel: ComparaisonBase;
  /** Vrai si la version présente ici est plus récente que celle du fichier. */
  versionLocalePlusRecente: boolean;
  /** Proposition par défaut : appliquer ou non cette ligne. */
  proposee: boolean;
  recue: EvaluationEchangee;
}

function lireEvaluationsBrutes(entrees: Entrees): unknown[] {
  const valeur = analyserJson(entrees[CLE_EVALUATIONS]);
  return Array.isArray(valeur) ? valeur : [];
}

function lireTitre(evaluation: Evaluation): string {
  return typeof evaluation.titre === "string" && evaluation.titre.trim() !== "" ? evaluation.titre : "(sans intitulé)";
}

/**
 * Calcule ce que l'import du fichier changerait, sans rien modifier.
 *
 * Une évaluation absente d'ici serait créée ; une évaluation présente dont le
 * modèle diffère serait modifiée ; les autres sont identiques. Les
 * évaluations présentes ici mais absentes du fichier ne sont pas concernées :
 * un fichier d'échange ne contient que ce que le collègue a choisi d'envoyer.
 */
export async function calculerPlan(entrees: Entrees, paquet: Paquet): Promise<LignePlan[]> {
  const locales = new Map(
    lireEvaluationsBrutes(entrees)
      .filter(estEvaluation)
      .map((evaluation) => [evaluation.id, evaluation]),
  );
  const dates = lireDatesModification(entrees[CLE_DATES_MODIFICATION]);
  const donnees = lireDonneesEtablissement(entrees[CLE_DONNEES]);
  const lignes: LignePlan[] = [];
  for (const recue of paquet.evaluations) {
    const locale = locales.get(recue.modele.id);
    const action: Action = locale === undefined ? "creer" : ontMemeModele(locale, recue.modele) ? "aucune" : "modifier";
    const modifieIciLe = locale === undefined ? "" : (dates[recue.modele.id] ?? "");
    // Les dates ISO 8601 en temps universel se comparent comme des textes.
    const versionLocalePlusRecente =
      action === "modifier" && modifieIciLe !== "" && recue.modifieLe !== "" && modifieIciLe > recue.modifieLe;
    lignes.push({
      identifiant: recue.modele.id,
      titre: lireTitre(recue.modele),
      action,
      modifieIciLe,
      modifieDansFichierLe: recue.modifieLe,
      rubriquesModifiees:
        action === "modifier" && locale !== undefined ? listerRubriquesModifiees(locale, recue.modele) : [],
      referentiel: await comparerBase(recue.base, donnees),
      versionLocalePlusRecente,
      proposee: action === "creer" || (action === "modifier" && !versionLocalePlusRecente),
      recue,
    });
  }
  return lignes;
}

/**
 * Applique les lignes choisies du plan et rend les entrées à enregistrer.
 *
 * - une évaluation créée arrive en tête de liste, rattachée à la version
 *   locale du référentiel quand son contenu est identique ;
 * - une évaluation modifiée garde les élèves, résultats et suivi d'ici ;
 * - les évaluations non choisies, et tout le reste des données, sont intacts.
 *
 * La date de modification retenue est celle du fichier, pour qu'un nouvel
 * import du même fichier trouve les évaluations identiques.
 */
export function appliquerPlan(
  entrees: Entrees,
  lignes: readonly LignePlan[],
  identifiantsChoisis: ReadonlySet<string>,
  maintenant: Date,
): Entrees {
  const choisies = new Map(
    lignes
      .filter((ligne) => ligne.action !== "aucune" && identifiantsChoisis.has(ligne.identifiant))
      .map((ligne) => [ligne.identifiant, ligne]),
  );
  if (choisies.size === 0) {
    return entrees;
  }
  const dates: Record<string, string> = { ...lireDatesModification(entrees[CLE_DATES_MODIFICATION]) };
  const dejaPresentes = new Set<string>();
  const conservees = lireEvaluationsBrutes(entrees).map((element): unknown => {
    if (!estEvaluation(element)) {
      return element;
    }
    dejaPresentes.add(element.id);
    const ligne = choisies.get(element.id);
    if (ligne === undefined) {
      return element;
    }
    dates[element.id] = ligne.modifieDansFichierLe || maintenant.toISOString();
    return remplacerModele(element, ligne.recue.modele);
  });
  const creees: Evaluation[] = [];
  for (const ligne of choisies.values()) {
    if (!dejaPresentes.has(ligne.identifiant)) {
      const versionLocale = ligne.referentiel.etat === "identique" ? ligne.referentiel.versionId : "";
      creees.push(versionLocale === "" ? ligne.recue.modele : { ...ligne.recue.modele, refV: versionLocale });
      dates[ligne.identifiant] = ligne.modifieDansFichierLe || maintenant.toISOString();
    }
  }
  return {
    ...entrees,
    [CLE_EVALUATIONS]: JSON.stringify([...creees, ...conservees]),
    [CLE_DATES_MODIFICATION]: JSON.stringify(dates),
  };
}
