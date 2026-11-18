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
