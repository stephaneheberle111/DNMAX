// SPDX-License-Identifier: CECILL-2.1
import type { DonneesEtablissement, Promotion } from "./echange/modele";

/**
 * Validation du référentiel par l'enseignant.
 *
 * L'enseignant est responsable du référentiel sur lequel il évalue : une
 * version ne compte comme validée que s'il a lui-même attesté, sur ce poste,
 * l'avoir vérifiée. Une version reçue d'un collègue, livrée avec
 * l'application ou validée avant l'existence de l'attestation n'en a pas.
 */

/** Vrai si la version désignée existe pour ce diplôme et que l'enseignant l'a attestée. */
export function versionAttestee(donnees: DonneesEtablissement, diplomeId: string, versionId: string): boolean {
  if (versionId === "") {
    return false;
  }
  const version = (donnees.versions.get(diplomeId) ?? []).find((candidate) => candidate.id === versionId);
  return version !== undefined && version.attestation !== "";
}

/** Vrai si la version en vigueur du diplôme est attestée par l'enseignant. */
export function diplomeAReferentielValide(donnees: DonneesEtablissement, diplomeId: string): boolean {
  return versionAttestee(donnees, diplomeId, donnees.versionsEnVigueur.get(diplomeId) ?? "");
}

/**
 * Version du référentiel que suit une promotion : celle qui lui a été
 * appliquée si elle existe encore, sinon la version en vigueur de son
 * diplôme (même règle que l'interface). Texte vide s'il n'y en a aucune.
 */
export function versionSuivie(donnees: DonneesEtablissement, promotion: Pick<Promotion, "diplomeId" | "versionId">): string {
  const versions = donnees.versions.get(promotion.diplomeId) ?? [];
  if (promotion.versionId !== "" && versions.some((version) => version.id === promotion.versionId)) {
    return promotion.versionId;
  }
  return donnees.versionsEnVigueur.get(promotion.diplomeId) ?? "";
}

/**
 * Vrai si la version que suit la promotion est attestée par l'enseignant.
 * Sans attestation, on peut évaluer quand même : DNMAX avertit l'enseignant
 * quand il coche la promotion (voir `promotionsAAvertir`).
 */
export function promotionAReferentielValide(
  donnees: DonneesEtablissement,
  promotion: Pick<Promotion, "diplomeId" | "versionId">,
): boolean {
  return versionAttestee(donnees, promotion.diplomeId, versionSuivie(donnees, promotion));
}

/**
 * Promotions à signaler quand l'enseignant change les promotions d'une
 * évaluation : celles qu'il vient de cocher et dont le référentiel n'est pas
 * validé. Décocher, ou recocher une promotion déjà cochée, n'avertit pas.
 */
export function promotionsAAvertir(avant: readonly string[], apres: readonly string[], referentielValide: (promotion: string) => boolean): string[] {
  return apres.filter((promotion) => !avant.includes(promotion) && !referentielValide(promotion));
}
