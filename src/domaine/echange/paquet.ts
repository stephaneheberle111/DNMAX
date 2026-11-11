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
  type ObjetJson,
} from "./modele";
import { extraireModele } from "./modele-evaluation";
import {
  decrireBase,
  retirerHorsContenu,
  trouverReferentielDeReference,
  type BaseReferentiel,
  type ReferentielLocal,
} from "./referentiel";
import { lireListes, preparerEnvoi, type ReferentielEchange } from "./referentiel-echange";
import { CLE_DATES_MODIFICATION, lireDatesModification } from "./suivi-modifications";
import { nettoyerNom } from "../identite";
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
  /** Nom de l'enseignant qui a fait cette modification, ou texte vide s'il est inconnu. */
  modifiePar: string;
  base: BaseReferentiel | null;
}

export interface Paquet {
  format: typeof FORMAT;
  version: number;
  creeLe: string;
  /** Nom de l'enseignant qui a créé le fichier, ou texte vide s'il est inconnu. */
  expediteur: string;
  evaluations: EvaluationEchangee[];
  referentiels: ReferentielEchange[];
}

export type ErreurPaquet = "illisible" | "format-inconnu" | "version-trop-recente";

/**
 * Construit le fichier d'échange des évaluations choisies, sans aucune donnée d'élève.
 *
 * Chaque évaluation emporte l'empreinte de son référentiel, lue dans
 * `catalogue`, que le référentiel lui-même soit envoyé ou non : c'est ce qui
 * permet au destinataire de vérifier qu'il travaille sur la même base.
 */
export function construirePaquet(
  entrees: Entrees,
  identifiantsChoisis: ReadonlySet<string>,
  maintenant: Date,
  expediteur: string,
  catalogue: readonly ReferentielLocal[],
  diplomesChoisis: ReadonlySet<string> = new Set(),
): Paquet {
  const promotions = lirePromotions(entrees[CLE_PROMOTIONS]);
  const donnees = lireDonneesEtablissement(entrees[CLE_DONNEES]);
  const dates = lireDatesModification(entrees[CLE_DATES_MODIFICATION]);
  const evaluations: EvaluationEchangee[] = [];
  for (const evaluation of lireEvaluations(entrees[CLE_EVALUATIONS])) {
    if (identifiantsChoisis.has(evaluation.id)) {
      evaluations.push({
        modele: extraireModele(evaluation),
        modifieLe: dates[evaluation.id]?.le ?? "",
        modifiePar: dates[evaluation.id]?.par ?? "",
        base: decrireBase(evaluation, promotions, donnees, catalogue),
      });
    }
  }
  return {
    format: FORMAT,
    version: VERSION_COURANTE,
    creeLe: maintenant.toISOString(),
    expediteur,
    evaluations,
    referentiels: extraireReferentiels(entrees, catalogue, diplomesChoisis),
  };
}

/**
 * Prépare l'envoi du référentiel de référence de chaque diplôme choisi
 * (version en vigueur, sinon référentiel de travail). Un diplôme dont le
 * référentiel est introuvable ou inutilisable est laissé de côté.
 */
function extraireReferentiels(
  entrees: Entrees,
  catalogue: readonly ReferentielLocal[],
  diplomesChoisis: ReadonlySet<string>,
): ReferentielEchange[] {
  const donnees = analyserJson(entrees[CLE_DONNEES]);
  if (!estObjet(donnees)) {
    return [];
  }
  const referentiels: ReferentielEchange[] = [];
  for (const diplomeId of diplomesChoisis) {
    const local = trouverReferentielDeReference(catalogue, diplomeId);
    if (local === null) {
      continue;
    }
    const versions: unknown = estObjet(donnees.versions) ? donnees.versions[diplomeId] : null;
    const version = (Array.isArray(versions) ? versions : []).find(
      (candidate: unknown): candidate is ObjetJson => estObjet(candidate) && candidate.id === local.versionId,
    );
    const structure: unknown =
      local.versionId === "" ? (estObjet(donnees.refs) ? donnees.refs[diplomeId] : null) : version?.snap;
    const base = { diplome: local.diplome, mention: local.mention, empreinte: local.empreinte, dateVersion: local.dateVersion };
    const envoi = preparerEnvoi(base, structure, donnees.dico, local.contenu);
    if (envoi !== null) {
      referentiels.push(envoi);
    }
  }
  return referentiels;
}

function lireReferentiel(valeur: unknown): ReferentielEchange | null {
  const base = lireBase(valeur);
  if (base === null || !estObjet(valeur)) {
    return null;
  }
  const structure = lireListes(valeur.structure);
  const dictionnaire = lireListes(valeur.dictionnaire);
  if (structure === null || dictionnaire === null) {
    return null;
  }
  return { ...base, structure, dictionnaire, contenuLisible: retirerHorsContenu(valeur.contenuLisible) };
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
 * Lit un fichier d'échange reçu d'un autre enseignant.
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
  if (!Array.isArray(valeur.evaluations) && !Array.isArray(valeur.referentiels)) {
    return "illisible";
  }
  const evaluations: EvaluationEchangee[] = [];
  const identifiantsVus = new Set<string>();
  for (const element of Array.isArray(valeur.evaluations) ? (valeur.evaluations as unknown[]) : []) {
    if (!estObjet(element) || !estEvaluation(element.modele) || identifiantsVus.has(element.modele.id)) {
      continue;
    }
    identifiantsVus.add(element.modele.id);
    evaluations.push({
      modele: extraireModele(element.modele),
      modifieLe: typeof element.modifieLe === "string" ? element.modifieLe : "",
      modifiePar: typeof element.modifiePar === "string" ? nettoyerNom(element.modifiePar) : "",
      base: lireBase(element.base),
    });
  }
  return {
    format: FORMAT,
    version: valeur.version,
    creeLe: typeof valeur.creeLe === "string" ? valeur.creeLe : "",
    expediteur: typeof valeur.expediteur === "string" ? nettoyerNom(valeur.expediteur) : "",
    evaluations,
    referentiels: (Array.isArray(valeur.referentiels) ? valeur.referentiels : [])
      .map(lireReferentiel)
      .filter((referentiel) => referentiel !== null),
  };
}
