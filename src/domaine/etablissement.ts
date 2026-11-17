// SPDX-License-Identifier: CECILL-2.1
/**
 * Mon établissement : état des promotions, répartition de service (qui
 * assure quel EC, année scolaire par année scolaire) et durée de
 * conservation proposée. Calculs seuls.
 */

/** Répartition d'une promotion pour une année scolaire : identifiants d'enseignants par EC. */
export type Repartition = Readonly<Record<string, readonly string[]>>;

/** Historique : année scolaire (« 2026-2027 ») → promotion → répartition. */
export type HistoriqueRepartition = Readonly<Record<string, Readonly<Record<string, Repartition>>>>;

/** Année de formation d'une promotion entrée en `debut`, à l'année scolaire qui commence en `anneeDebutScolaire`. */
export function anneeDeFormation(debut: number, anneeDebutScolaire: number): number {
  return anneeDebutScolaire - debut + 1;
}

/** Ce qu'on dit d'une promotion à une année scolaire : à venir, terminée, ou son année de formation. */
export function etatPromotion(annee: number, duree: number): { etat: "a-venir" | "terminee" | "en-cours"; annee: number } {
  if (annee < 1) return { etat: "a-venir", annee };
  if (annee > duree) return { etat: "terminee", annee };
  return { etat: "en-cours", annee };
}

/** Année scolaire qui commence l'année civile `annee` : « 2026-2027 ». */
export function anneeScolaireDe(annee: number): string {
  return `${String(annee)}-${String(annee + 1)}`;
}

/** Ajoute (ou retire) un enseignant d'un EC ; l'ajout ne crée pas de doublon. */
export function changerEnseignantDeLEc(repartition: Repartition, ec: string, enseignant: string, present: boolean): Record<string, string[]> {
  const copie: Record<string, string[]> = Object.fromEntries(Object.entries(repartition).map(([cle, liste]) => [cle, [...liste]]));
  const liste = copie[ec] ?? [];
  copie[ec] = present ? [...new Set([...liste, enseignant])] : liste.filter((autre) => autre !== enseignant);
  return copie;
}

/** EC dont aucun enseignant connu n'est chargé. */
export function ecsSansEnseignant(ecs: readonly string[], repartition: Repartition, enseignantsConnus: ReadonlySet<string>): string[] {
  return ecs.filter((ec) => !(repartition[ec] ?? []).some((id) => enseignantsConnus.has(id)));
}

/** Vrai si l'enseignant a eu la promotion, une année ou une autre (ses étudiants et ses anciens étudiants). */
export function aEuLaPromotion(historique: HistoriqueRepartition, promotion: string, enseignant: string): boolean {
  if (enseignant === "") return false;
  return Object.values(historique).some((annee) => Object.values(annee[promotion] ?? {}).some((liste) => liste.includes(enseignant)));
}

/** Durées de conservation proposées après la sortie d'une promotion, en mois. */
export const DUREES_CONSERVATION = [3, 6, 9, 12, 18, 24, 36, 48, 60] as const;

/** « 6 mois », « 1 an », « 18 mois », « 2 ans ». */
export function libelleDuree(mois: number): string {
  if (mois % 12 !== 0) return `${String(mois)} mois`;
  return mois === 12 ? "1 an" : `${String(mois / 12)} ans`;
}
