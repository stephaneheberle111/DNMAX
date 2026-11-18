// SPDX-License-Identifier: CECILL-2.1
/**
 * Étape 1 de l'éditeur : les unités d'enseignement (UE) et les enseignements
 * constitutifs (EC) que l'évaluation retient au semestre. Calculs seuls.
 */

/** Un EC proposé au semestre, avec l'UE à laquelle il appartient. */
export interface EcDuSemestre {
  readonly ec: string;
  readonly ue: string;
}

/** UE et EC retenus par l'évaluation. */
export interface Cadre {
  readonly ues: readonly string[];
  readonly ecCodes: readonly string[];
}

/** Rang d'un code d'EC pour le tri : « EC 2.3 » vient avant « EC 10.1 ». Sans nombre, il passe à la fin. */
export function rangEc(code: string): number {
  const nombres = /(\d+)\.?(\d+)?/.exec(code);
  if (nombres === null) return 9999;
  return Number(nombres[1]) * 100 + Number(nombres[2] ?? 0);
}

function trier(codes: Iterable<string>): string[] {
  return [...new Set(codes)].sort((a, b) => rangEc(a) - rangEc(b));
}

/** Ne garde que les UE et les EC proposés au semestre (après un changement de semestre). */
export function cadreDuSemestre(cadre: Cadre, ecs: readonly EcDuSemestre[]): { ues: string[]; ecCodes: string[] } {
  const ues = new Set(ecs.map((entree) => entree.ue));
  return {
    ues: cadre.ues.filter((ue) => ues.has(ue)),
    ecCodes: cadre.ecCodes.filter((code) => ecs.some((entree) => entree.ec === code)),
  };
}

/** Coche une UE avec tous ses EC du semestre, ou la décoche avec eux. */
export function basculerUe(cadre: Cadre, ue: string, ecs: readonly EcDuSemestre[]): { ues: string[]; ecCodes: string[] } {
  const ecsDeLUe = ecs.filter((entree) => entree.ue === ue).map((entree) => entree.ec);
  if (cadre.ues.includes(ue)) {
    return { ues: cadre.ues.filter((autre) => autre !== ue), ecCodes: cadre.ecCodes.filter((code) => !ecsDeLUe.includes(code)) };
  }
  return { ues: [...cadre.ues, ue], ecCodes: trier([...cadre.ecCodes, ...ecsDeLUe]) };
}

/**
 * Coche ou décoche un EC. Coché, son UE est retenue ; décoché, son UE est
 * retirée s'il n'en reste aucun autre EC retenu.
 */
export function basculerEc(cadre: Cadre, code: string, ecs: readonly EcDuSemestre[]): { ues: string[]; ecCodes: string[] } {
  const retire = cadre.ecCodes.includes(code);
  const ecCodes = trier(retire ? cadre.ecCodes.filter((autre) => autre !== code) : [...cadre.ecCodes, code]);
  const ue = ecs.find((entree) => entree.ec === code)?.ue;
  if (ue === undefined) return { ues: [...cadre.ues], ecCodes };
  if (!retire) return { ues: cadre.ues.includes(ue) ? [...cadre.ues] : [...cadre.ues, ue], ecCodes };
  const resteUnEc = ecCodes.some((autre) => ecs.find((entree) => entree.ec === autre)?.ue === ue);
  return { ues: resteUnEc ? [...cadre.ues] : cadre.ues.filter((autre) => autre !== ue), ecCodes };
}

/** UE retenues : celles cochées, plus celles des EC cochés seuls. */
export function uesRetenues(cadre: Cadre, ecs: readonly EcDuSemestre[]): string[] {
  const ues = [...cadre.ues];
  for (const code of cadre.ecCodes) {
    const ue = ecs.find((entree) => entree.ec === code)?.ue;
    if (ue !== undefined && !ues.includes(ue)) ues.push(ue);
  }
  return ues;
}

/** Une promotion proposée à l'étape 1 : son année de formation à l'année scolaire de l'évaluation, `null` si elle est inconnue. */
export interface PromotionDuDiplome {
  readonly nom: string;
  readonly annee: number | null;
}

/**
 * Promotions qu'on ne peut plus cocher : une évaluation peut viser plusieurs
 * promotions, mais toutes de la même année de formation que la première cochée.
 */
export function promotionsBloquees(promotions: readonly PromotionDuDiplome[], cochees: readonly string[]): Set<string> {
  const premiere = cochees.map((nom) => promotions.find((promotion) => promotion.nom === nom)).find((promotion) => promotion !== undefined);
  const annee = premiere?.annee ?? null;
  return new Set(
    annee === null
      ? []
      : promotions
          .filter((promotion) => !cochees.includes(promotion.nom) && promotion.annee !== null && promotion.annee !== annee)
          .map((promotion) => promotion.nom),
  );
}

/**
 * Promotions proposées à une évaluation, en deux groupes : celles de la
 * répartition de service de l'enseignant d'abord, puis les autres, montrées
 * plus discrètement. L'ordre de chaque groupe est gardé.
 */
export function separerMiennes<P extends { readonly mienne: boolean }>(promotions: readonly P[]): { miennes: P[]; autres: P[] } {
  return { miennes: promotions.filter((promotion) => promotion.mienne), autres: promotions.filter((promotion) => !promotion.mienne) };
}

/**
 * Promotions hors de la répartition de service à montrer à l'étape 1 :
 * toutes si l'enseignant l'a demandé ou s'il n'a encore aucune promotion à
 * lui ; sinon seulement celles déjà cochées, qui ne doivent pas disparaître.
 */
export function autresPromotionsMontrees<P extends { readonly nom: string }>(
  autres: readonly P[],
  cochees: readonly string[],
  affichees: boolean,
  aDesMiennes: boolean,
): P[] {
  return affichees || !aDesMiennes ? [...autres] : autres.filter((promotion) => cochees.includes(promotion.nom));
}

/** Une promotion du diplôme, avec son année de formation à l'année scolaire de l'évaluation et la durée du diplôme. */
export interface PromotionDatee {
  readonly nom: string;
  readonly annee: number;
  readonly duree: number;
  /** Rang du diplôme (de la mention) dans la liste des diplômes, pour départager deux promotions de même année. */
  readonly rangDiplome: number;
}

/** Vrai si la promotion est en formation à l'année scolaire de l'évaluation. */
export function estEnCours(promotion: PromotionDatee): boolean {
  return promotion.annee >= 1 && promotion.annee <= promotion.duree;
}

/**
 * Promotions proposées à l'étape 1 : celles en cours, par année de formation
 * puis par diplôme, suivies de celles déjà cochées qui ne le sont plus
 * (une évaluation ancienne garde ses promotions). Sans doublon ni nom vide.
 */
export function promotionsAProposer(promotions: readonly PromotionDatee[], cochees: readonly string[]): { noms: string[]; aucuneEnCours: boolean } {
  const enCours = promotions.filter(estEnCours).sort((premiere, seconde) => premiere.annee - seconde.annee || premiere.rangDiplome - seconde.rangDiplome);
  return {
    noms: [...new Set([...enCours.map((promotion) => promotion.nom), ...cochees])].filter(Boolean),
    aucuneEnCours: enCours.length === 0,
  };
}

/**
 * Étudiants visés par l'évaluation (module Étudiants) : la liste choisie, ou
 * l'étudiant unique des évaluations plus anciennes, réduits à ceux qui sont
 * encore dans ses promotions. Une liste vide vise toute la promotion.
 */
export function etudiantsVises(evaluation: { readonly eleveIds?: unknown; readonly eleveId?: unknown }, existants: readonly string[]): string[] {
  const choisis: readonly unknown[] = Array.isArray(evaluation.eleveIds) ? evaluation.eleveIds : evaluation.eleveId ? [evaluation.eleveId] : [];
  return choisis.filter((id): id is string => existants.some((existant) => existant === id));
}

/** Répartition de service d'une promotion : enseignants de chaque EC (par identifiant d'EC) et EC de l'année. */
export interface RepartitionDePromotion {
  readonly affectations: Readonly<Record<string, readonly string[] | undefined>>;
  readonly ecs: readonly { readonly id: string; readonly code: string }[];
}

/**
 * Codes des EC que les enseignants choisis assurent pour les promotions
 * cochées, d'après la répartition de service. `null` (pas de restriction)
 * sans enseignant, sans promotion, ou si aucune de ces promotions n'a
 * encore de répartition.
 */
export function ecsAssures(enseignants: readonly string[], repartitions: readonly RepartitionDePromotion[]): Set<string> | null {
  if (!enseignants.length || !repartitions.length) return null;
  const codes = new Set<string>();
  let repartie = false;
  for (const repartition of repartitions) {
    if (Object.keys(repartition.affectations).length) repartie = true;
    for (const ec of repartition.ecs) {
      if ((repartition.affectations[ec.id] || []).some((id) => enseignants.includes(id))) codes.add(ec.code);
    }
  }
  return repartie ? codes : null;
}

/**
 * Autres évaluations des promotions cochées, pour la progression de l'étape 2 :
 * ni l'évaluation en cours, ni les brouillons. Une évaluation est d'une
 * promotion si elle la coche, ou par son ancienne promotion liée.
 */
export function autresEvaluationsDesPromotions<E extends { readonly id?: unknown; readonly brouillon?: unknown; readonly classes?: unknown; readonly promoId?: unknown }>(
  evaluations: readonly E[],
  idCourante: unknown,
  promotions: readonly { readonly nom?: unknown; readonly id?: unknown }[],
): E[] {
  return evaluations.filter(
    (evaluation) =>
      evaluation.id !== idCourante &&
      !evaluation.brouillon &&
      promotions.some((promotion) => ((evaluation.classes || []) as readonly unknown[]).includes(promotion.nom) || evaluation.promoId === promotion.id),
  );
}
