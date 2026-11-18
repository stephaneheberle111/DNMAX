// SPDX-License-Identifier: CECILL-2.1
/**
 * Versions datées du référentiel d'une mention : quelle version suit une
 * promotion, une évaluation, qui utilise une version, et quel diplôme bloque
 * une évaluation. Règles reprises de l'interface historique (décision 38),
 * appliquées aux données telles qu'elle les tient (champs non typés).
 *
 * Une promotion suit la version qui lui a été appliquée (`refV`) si elle
 * existe encore, sinon la version en vigueur de sa mention. Une évaluation
 * enregistrée garde la version sur laquelle elle a été faite (`refV`) :
 * appliquer une nouvelle version à une promotion ne touche pas à ses
 * évaluations passées.
 */

export type Objet = Record<string, unknown>;

function noms(evaluation: Objet): unknown[] {
  return Array.isArray(evaluation.classes) ? (evaluation.classes as unknown[]) : [];
}

/** Promotions d'une évaluation, sans doublon : sa promotion, puis celles de ses classes, dans cet ordre. */
export function promotionsDeLEvaluation(evaluation: Objet, promotions: readonly Objet[]): Objet[] {
  const trouvees = [
    promotions.find((promotion) => promotion.id === evaluation.promoId),
    ...noms(evaluation).map((nom) => promotions.find((promotion) => promotion.nom === nom)),
  ].filter((promotion): promotion is Objet => Boolean(promotion));
  return [...new Set(trouvees)];
}

/** Promotion d'une évaluation : la sienne, sinon la première de ses classes qui existe ; `null` sinon. */
export function promotionDeLEvaluation(evaluation: Objet, promotions: readonly Objet[]): Objet | null {
  return promotionsDeLEvaluation(evaluation, promotions)[0] ?? null;
}

/** Mention de la promotion d'une évaluation, si elle existe encore parmi les diplômes ; texte vide sinon. */
export function mentionDeLEvaluation(evaluation: Objet, promotions: readonly Objet[], diplomes: readonly Objet[]): string {
  const diplome = promotionDeLEvaluation(evaluation, promotions)?.diplomeId;
  return diplome && diplomes.some((candidat) => candidat.id === diplome) ? (diplome as string) : "";
}

/** Identifiant de la version que suit une promotion ; texte vide sans promotion ou sans version en vigueur. */
export function versionDeLaPromotion(promotion: Objet | null, versions: readonly Objet[], enVigueur: unknown): string {
  if (!promotion) return "";
  if (promotion.refV && versions.some((version) => version.id === promotion.refV)) return promotion.refV as string;
  return (enVigueur as string) || "";
}

/**
 * Version suivie par une évaluation dans la mention affichée : la sienne si
 * elle existe encore, sinon celle de sa promotion. `null` si sa promotion
 * manque ou relève d'une autre mention.
 */
export function versionDeLEvaluation(
  evaluation: Objet,
  promotion: Objet | null,
  mention: unknown,
  versions: readonly Objet[],
  enVigueur: unknown,
): Objet | null {
  if (!promotion || promotion.diplomeId !== mention) return null;
  const id = evaluation.refV && versions.some((version) => version.id === evaluation.refV) ? evaluation.refV : versionDeLaPromotion(promotion, versions, enVigueur);
  return versions.find((version) => version.id === id) ?? null;
}

/** Vrai si le référentiel a, sorte par sorte, exactement le contenu de la copie (une version validée). */
export function referentielIdentique(copie: Objet, referentiel: Objet, sortes: readonly string[]): boolean {
  return JSON.stringify(sortes.map((sorte) => copie[sorte])) === JSON.stringify(sortes.map((sorte) => referentiel[sorte]));
}

/** Promotions de la mention qui suivent la version, et évaluations faites sur elle. */
export function usageDeLaVersion(
  mention: unknown,
  version: unknown,
  promotions: readonly Objet[],
  evaluations: readonly Objet[],
  versionSuivie: (promotion: Objet) => string,
): { ps: Objet[]; fs: Objet[] } {
  return {
    ps: promotions.filter((promotion) => promotion.diplomeId === mention && versionSuivie(promotion) === version),
    fs: evaluations.filter((evaluation) => evaluation.refV === version),
  };
}

/**
 * Diplôme dont le référentiel bloque l'évaluation, ou texte vide si rien ne
 * la bloque. Sans promotion, c'est le diplôme affiché qui compte ; sinon la
 * première promotion au référentiel non validé (sa mention, ou le diplôme
 * affiché si elle n'en a pas).
 */
export function diplomeBloquant(
  promotions: readonly Objet[],
  diplomeAffiche: string,
  diplomeValide: (diplome: string) => boolean,
  promotionValide: (promotion: Objet) => boolean,
): string {
  if (!promotions.length) return diplomeValide(diplomeAffiche) ? "" : diplomeAffiche;
  const bloquante = promotions.find((promotion) => !promotionValide(promotion));
  return bloquante ? (bloquante.diplomeId as string) || diplomeAffiche : "";
}

/** Nombre d'étudiants d'une liste saisie, une ligne non vide par étudiant. */
export function nombreEtudiants(liste: unknown): number {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- liste saisie, convertie comme avant
  return String(liste || "")
    .split(/\r?\n/)
    .filter((ligne) => ligne.trim()).length;
}
