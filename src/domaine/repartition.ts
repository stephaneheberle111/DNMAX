// SPDX-License-Identifier: CECILL-2.1
/**
 * Répartition de service, telle que l'interface la tient : EC de l'année
 * d'une promotion dans le référentiel de sa mention, années scolaires
 * proposées, et si un enseignant a eu une promotion. Règles reprises de
 * l'interface historique (décision 38), appliquées aux données non typées.
 */
import { numeroCode } from "./constituer";
import { anneeScolaireDe } from "./etablissement";

export type Objet = Record<string, unknown>;

/** Couleur d'un EC dont ni l'EC ni son UE n'ont de couleur. */
const COULEUR_PAR_DEFAUT = "#9aa2ae";

function liste(valeur: unknown): Objet[] {
  return Array.isArray(valeur) ? (valeur as Objet[]) : [];
}

/** Un EC de l'année d'une promotion, tel que la répartition l'affiche. */
export interface EcDeLAnnee {
  id: string;
  code: string;
  nom: string;
  couleur: string;
  ue: string;
  ueId: string;
}

/**
 * EC du référentiel d'une mention qui ont un code pour l'année de formation
 * donnée, avec leur nom, leur couleur et leur UE lus dans le dictionnaire,
 * rangés par numéro de code. Un EC sans code cette année-là n'y est pas.
 */
export function ecsDeLAnnee(ecsDuReferentiel: readonly Objet[], dictionnaire: Objet, annee: number): EcDeLAnnee[] {
  const ecs = liste(dictionnaire.ecs);
  const ues = liste(dictionnaire.ues);
  return ecsDuReferentiel
    .map((element) => {
      const ec = ecs.find((candidat) => candidat.id === element.id) ?? {};
      const code = (((element.codes ?? {}) as Objet)[annee] as string) || "";
      const ue = ues.find((candidat) => candidat.id === element.ueId) ?? {};
      return code
        ? {
            id: element.id as string,
            code,
            nom: (ec.nom as string) || code,
            couleur: (ec.couleur as string) || (ue.couleur as string) || COULEUR_PAR_DEFAUT,
            ue: (ue.nom as string) || "",
            ueId: (element.ueId as string) || "",
          }
        : null;
    })
    .filter((ec): ec is EcDeLAnnee => ec !== null)
    .sort((un, autre) => numeroCode(un.code) - numeroCode(autre.code));
}

/** Les cinq années scolaires proposées, de celle qui commence en `debut` aux quatre précédentes. */
export function anneesProposees(debut: number): string[] {
  return [0, 1, 2, 3, 4].map((recul) => anneeScolaireDe(debut - recul));
}

/**
 * Vrai si l'enseignant a eu la promotion, une année ou une autre (ses
 * étudiants et ses anciens étudiants). Tolère les années, promotions ou
 * listes absentes d'un historique ancien.
 */
export function aEuLaPromotion(historique: Objet, promotion: unknown, enseignant: unknown): boolean {
  if (!enseignant) return false;
  return Object.values(historique).some((annee) =>
    Object.values((((annee ?? {}) as Objet)[promotion as string] ?? {}) as Objet).some((enseignants) => liste(enseignants).includes(enseignant as Objet)),
  );
}

/**
 * EC qu'un enseignant assure l'année scolaire donnée, toutes promotions
 * confondues, d'après la répartition de service. Ensemble vide sans
 * enseignant, sans cette année ou sans affectation.
 */
export function ecsDeLEnseignant(historique: Objet, anneeScolaire: string, enseignant: unknown): Set<string> {
  const ecs = new Set<string>();
  if (!enseignant) return ecs;
  const parPromotion = (historique[anneeScolaire] ?? {}) as Objet;
  for (const parEc of Object.values(parPromotion)) {
    for (const [ec, enseignants] of Object.entries((parEc ?? {}) as Objet)) {
      if (liste(enseignants).includes(enseignant as Objet)) ecs.add(ec);
    }
  }
  return ecs;
}

/** Ce qu'une répartition de service retient d'un référentiel : noms d'UE, EC, numéros de bloc, codes de compétence. */
export interface ElementsRetenus {
  ues: Set<string>;
  ecs: ReadonlySet<string>;
  blocs: Set<string>;
  competences: Set<string>;
}

/**
 * UE, blocs et compétences qui vont avec les EC retenus : l'UE de chaque EC
 * retenu, les compétences rattachées à au moins un de ces EC, et leurs blocs.
 */
export function elementsDeLaRepartition(ues: readonly Objet[], ecs: readonly Objet[], competences: readonly Objet[], retenus: ReadonlySet<string>): ElementsRetenus {
  const idsUes = new Set(ecs.filter((ec) => retenus.has(ec.id as string)).map((ec) => ec.ueId));
  const gardees = competences.filter((competence) => liste(competence.ecIds).some((id) => retenus.has(id as unknown as string)));
  return {
    ues: new Set(ues.filter((ue) => idsUes.has(ue.id)).map((ue) => String(ue.nom))),
    ecs: retenus,
    blocs: new Set(gardees.map((competence) => String(competence.bloc))),
    competences: new Set(gardees.map((competence) => String(competence.code))),
  };
}
