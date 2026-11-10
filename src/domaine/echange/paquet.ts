// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CLE_DONNEES,
  CLE_EVALUATIONS,
  CLE_PROMOTIONS,
  analyserJson,
  estEvaluation,
  estObjet,
  lireDonneesEtablissement,
  lireEvaluations,
  lirePromotions,
  type Evaluation,
} from "./modele";
import { extraireModele } from "./modele-evaluation";
import { decrireBase, type BaseReferentiel } from "./referentiel";
import { CLE_DATES_MODIFICATION, lireDatesModification } from "./suivi-modifications";
import type { Entrees } from "../magasin-memoire";

const FORMAT = "dnmax-echange";
const VERSION_COURANTE = 1;

/** Extension des fichiers d'échange. */
export const EXTENSION_FICHIER = ".dnmax";

export interface EvaluationEchangee {
  /** Modèle de l'évaluation, sans élèves ni résultats. */
  modele: Evaluation;
  /** Date de dernière modification chez l'expéditeur, ou texte vide si elle est inconnue. */
  modifieLe: string;
  base: BaseReferentiel | null;
}

export interface Paquet {
  format: typeof FORMAT;
  version: number;
  creeLe: string;
  evaluations: EvaluationEchangee[];
}

export type ErreurPaquet = "illisible" | "format-inconnu" | "version-trop-recente";

/** Construit le fichier d'échange des évaluations choisies, sans aucune donnée d'élève. */
export async function construirePaquet(
  entrees: Entrees,
  identifiantsChoisis: ReadonlySet<string>,
  maintenant: Date,
): Promise<Paquet> {
  const promotions = lirePromotions(entrees[CLE_PROMOTIONS]);
  const donnees = lireDonneesEtablissement(entrees[CLE_DONNEES]);
  const dates = lireDatesModification(entrees[CLE_DATES_MODIFICATION]);
  const evaluations: EvaluationEchangee[] = [];
  for (const evaluation of lireEvaluations(entrees[CLE_EVALUATIONS])) {
    if (identifiantsChoisis.has(evaluation.id)) {
      evaluations.push({
        modele: extraireModele(evaluation),
        modifieLe: dates[evaluation.id] ?? "",
        base: await decrireBase(evaluation, promotions, donnees),
      });
    }
  }
  return { format: FORMAT, version: VERSION_COURANTE, creeLe: maintenant.toISOString(), evaluations };
}

function lireBase(valeur: unknown): BaseReferentiel | null {
  if (
    !estObjet(valeur) ||
    typeof valeur.diplome !== "string" ||
    typeof valeur.mention !== "string" ||
    typeof valeur.empreinte !== "string" ||
    typeof valeur.dateVersion !== "string"
  ) {
    return null;
  }
  return {
    diplome: valeur.diplome,
    mention: valeur.mention,
    empreinte: valeur.empreinte,
    dateVersion: valeur.dateVersion,
  };
}

/**
 * Lit un fichier d'échange reçu d'un collègue.
 *
 * Le fichier vient de l'extérieur : sa forme est vérifiée, et tout modèle
 * reçu repasse par `extraireModele` pour qu'un fichier trafiqué ne puisse pas
 * injecter des résultats d'élèves ni des identifiants locaux.
 */
export function lirePaquet(texte: string): Paquet | ErreurPaquet {
  const valeur = analyserJson(texte);
  if (!estObjet(valeur)) {
    return "illisible";
  }
  if (valeur.format !== FORMAT || typeof valeur.version !== "number") {
    return "format-inconnu";
  }
  if (valeur.version > VERSION_COURANTE) {
    return "version-trop-recente";
  }
  if (!Array.isArray(valeur.evaluations)) {
    return "illisible";
  }
  const evaluations: EvaluationEchangee[] = [];
  const identifiantsVus = new Set<string>();
  for (const element of valeur.evaluations) {
    if (!estObjet(element) || !estEvaluation(element.modele) || identifiantsVus.has(element.modele.id)) {
      continue;
    }
    identifiantsVus.add(element.modele.id);
    evaluations.push({
      modele: extraireModele(element.modele),
      modifieLe: typeof element.modifieLe === "string" ? element.modifieLe : "",
      base: lireBase(element.base),
    });
  }
  return {
    format: FORMAT,
    version: valeur.version,
    creeLe: typeof valeur.creeLe === "string" ? valeur.creeLe : "",
    evaluations,
  };
}
