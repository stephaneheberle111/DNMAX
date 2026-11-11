// SPDX-License-Identifier: AGPL-3.0-or-later
import { calculerEmpreinte } from "../empreinte";
import {
  estObjet,
  trouverPromotion,
  type DonneesEtablissement,
  type Evaluation,
  type Promotion,
} from "./modele";

/** Le référentiel sur lequel une évaluation a été construite, décrit sans identifiant local. */
export interface BaseReferentiel {
  diplome: string;
  mention: string;
  /** Empreinte du contenu du référentiel. */
  empreinte: string;
  /** Date de validation de la version, ou texte vide pour un référentiel de travail non validé. */
  dateVersion: string;
}

/** Un référentiel présent sur ce poste : une version validée, ou le référentiel de travail d'un diplôme. */
export interface ReferentielLocal extends BaseReferentiel {
  diplomeId: string;
  /** Identifiant de la version, ou texte vide pour le référentiel de travail. */
  versionId: string;
  /** Vrai pour la version en vigueur du diplôme. */
  enVigueur: boolean;
  /** Contenu lisible du référentiel, pour montrer ce qui le distingue d'un autre. */
  contenu: unknown;
}

/**
 * Le référentiel qui fait foi pour un diplôme : sa version en vigueur, sinon
 * son référentiel de travail. C'est lui qu'on envoie et auquel on compare.
 */
export function trouverReferentielDeReference(
  catalogue: readonly ReferentielLocal[],
  diplomeId: string,
): ReferentielLocal | null {
  const duDiplome = catalogue.filter((referentiel) => referentiel.diplomeId === diplomeId);
  return (
    duDiplome.find((referentiel) => referentiel.enVigueur) ??
    duDiplome.find((referentiel) => referentiel.versionId === "") ??
    null
  );
}

/**
 * Champs ignorés par l'empreinte :
 * - identifiants internes, propres à chaque poste ;
 * - couleurs d'affichage, sans portée pédagogique ;
 * - intitulé du diplôme et de la mention, comparés à part et de façon tolérante
 *   (casse, accents) pour retrouver le diplôme chez le destinataire.
 */
const CHAMPS_HORS_CONTENU: ReadonlySet<string> = new Set([
  "id",
  "couleur",
  "blocTint",
  "diplome",
  "diplomeNom",
  "mention",
]);

/**
 * Réduit le contenu lisible d'un référentiel à ce qui compte pour savoir si
 * deux enseignants travaillent sur la même base : libellés, codes,
 * rattachements, semestres. Deux référentiels saisis séparément mais de même
 * contenu obtiennent ainsi la même empreinte.
 */
export function retirerHorsContenu(valeur: unknown): unknown {
  if (Array.isArray(valeur)) {
    return valeur.map(retirerHorsContenu);
  }
  if (estObjet(valeur)) {
    return Object.fromEntries(
      Object.entries(valeur)
        .filter(([cle]) => !CHAMPS_HORS_CONTENU.has(cle))
        .map(([cle, contenu]) => [cle, retirerHorsContenu(contenu)]),
    );
  }
  return valeur;
}

/** Indique si un référentiel ne contient encore aucune compétence. */
export function estReferentielVide(contenuLisible: unknown): boolean {
  const competences: unknown = estObjet(contenuLisible) ? contenuLisible.competences : null;
  return !Array.isArray(competences) || competences.length === 0;
}

/** Empreinte du contenu lisible d'un référentiel. */
export async function calculerEmpreinteReferentiel(contenuLisible: unknown): Promise<string> {
  return calculerEmpreinte(retirerHorsContenu(contenuLisible));
}

/** Ramène un nom à une forme comparable : casse, accents et espaces superflus ignorés. */
export function normaliserNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Détermine le référentiel d'une évaluation : la version qu'elle a figée,
 * sinon celle de sa promotion, sinon celle en vigueur, sinon le référentiel
 * de travail du diplôme. Rend `null` si l'évaluation n'est rattachée à aucune
 * promotion connue (on ne sait alors pas de quel diplôme elle relève) ou si
 * ce référentiel manque au catalogue.
 */
export function decrireBase(
  evaluation: Evaluation,
  promotions: Promotion[],
  donnees: DonneesEtablissement,
  catalogue: readonly ReferentielLocal[],
): BaseReferentiel | null {
  const promotion = trouverPromotion(evaluation, promotions);
  if (promotion === null || !donnees.diplomes.some((diplome) => diplome.id === promotion.diplomeId)) {
    return null;
  }
  const versions = donnees.versions.get(promotion.diplomeId) ?? [];
  const identifiantsSouhaites = [
    evaluation.refV,
    promotion.versionId,
    donnees.versionsEnVigueur.get(promotion.diplomeId),
  ];
  const versionId =
    identifiantsSouhaites.find(
      (identifiant): identifiant is string =>
        typeof identifiant === "string" && identifiant !== "" && versions.some((version) => version.id === identifiant),
    ) ?? "";
  const local = catalogue.find(
    (referentiel) => referentiel.diplomeId === promotion.diplomeId && referentiel.versionId === versionId,
  );
  if (local === undefined) {
    return null;
  }
  return { diplome: local.diplome, mention: local.mention, empreinte: local.empreinte, dateVersion: local.dateVersion };
}

export type ComparaisonBase =
  /** Le même référentiel existe ici ; `versionId` vaut "" s'il s'agit du référentiel de travail. */
  | { etat: "identique"; versionId: string }
  /** Le diplôme existe ici, mais aucun de ses référentiels n'a ce contenu. */
  | { etat: "different" }
  /** Aucun diplôme de ce nom et de cette mention n'existe ici. */
  | { etat: "diplome-absent" }
  /** Le fichier ne dit pas sur quel référentiel l'évaluation a été construite. */
  | { etat: "inconnue" };

/** Cherche, parmi les référentiels de ce poste, celui que décrit `base`. */
export function comparerBase(base: BaseReferentiel | null, catalogue: readonly ReferentielLocal[]): ComparaisonBase {
  if (base === null) {
    return { etat: "inconnue" };
  }
  const duDiplome = catalogue.filter(
    (referentiel) =>
      normaliserNom(referentiel.diplome) === normaliserNom(base.diplome) &&
      normaliserNom(referentiel.mention) === normaliserNom(base.mention),
  );
  if (duDiplome.length === 0) {
    return { etat: "diplome-absent" };
  }
  // À contenu égal, une version validée est préférée au référentiel de travail, qui peut encore bouger.
  const identiques = duDiplome.filter((referentiel) => referentiel.empreinte === base.empreinte);
  const retenu = identiques.find((referentiel) => referentiel.versionId !== "") ?? identiques[0];
  return retenu === undefined ? { etat: "different" } : { etat: "identique", versionId: retenu.versionId };
}
