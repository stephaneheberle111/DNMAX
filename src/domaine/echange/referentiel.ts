// SPDX-License-Identifier: AGPL-3.0-or-later
import { calculerEmpreinte } from "../empreinte";
import { trouverPromotion, type DonneesEtablissement, type Evaluation, type Promotion } from "./modele";

/** Le référentiel sur lequel une évaluation a été construite, décrit sans identifiant local. */
export interface BaseReferentiel {
  diplome: string;
  mention: string;
  /** Empreinte du contenu du référentiel. */
  empreinte: string;
  /** Date de validation de la version, ou texte vide pour un référentiel de travail non validé. */
  dateVersion: string;
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
 * promotion connue : on ne sait alors pas de quel diplôme elle relève.
 */
export async function decrireBase(
  evaluation: Evaluation,
  promotions: Promotion[],
  donnees: DonneesEtablissement,
): Promise<BaseReferentiel | null> {
  const promotion = trouverPromotion(evaluation, promotions);
  const diplome = donnees.diplomes.find((candidat) => candidat.id === promotion?.diplomeId);
  if (promotion === null || diplome === undefined) {
    return null;
  }
  const versions = donnees.versions.get(diplome.id) ?? [];
  const identifiantsSouhaites = [evaluation.refV, promotion.versionId, donnees.versionsEnVigueur.get(diplome.id)];
  const version = identifiantsSouhaites
    .map((identifiant) => versions.find((candidate) => candidate.id !== "" && candidate.id === identifiant))
    .find((trouvee) => trouvee !== undefined);
  const contenu = version?.contenu ?? donnees.referentiels.get(diplome.id) ?? [];
  return {
    diplome: diplome.nom,
    mention: diplome.mention,
    empreinte: await calculerEmpreinte(contenu),
    dateVersion: version?.date ?? "",
  };
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

/** Cherche, dans les données locales, le référentiel décrit par `base`. */
export async function comparerBase(
  base: BaseReferentiel | null,
  donnees: DonneesEtablissement,
): Promise<ComparaisonBase> {
  if (base === null) {
    return { etat: "inconnue" };
  }
  const diplome = donnees.diplomes.find(
    (candidat) =>
      normaliserNom(candidat.nom) === normaliserNom(base.diplome) &&
      normaliserNom(candidat.mention) === normaliserNom(base.mention),
  );
  if (diplome === undefined) {
    return { etat: "diplome-absent" };
  }
  for (const version of donnees.versions.get(diplome.id) ?? []) {
    if ((await calculerEmpreinte(version.contenu)) === base.empreinte) {
      return { etat: "identique", versionId: version.id };
    }
  }
  const travail = donnees.referentiels.get(diplome.id);
  if (travail !== undefined && (await calculerEmpreinte(travail)) === base.empreinte) {
    return { etat: "identique", versionId: "" };
  }
  return { etat: "different" };
}
