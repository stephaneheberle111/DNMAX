// SPDX-License-Identifier: CECILL-2.1
/**
 * Progression : quelles promotions et quels semestres proposer, et comment
 * ranger les compétences de la vue « Promotion ». Les calculs de couverture
 * et de niveaux sont dans `domaine/progression`. Règles reprises telles
 * quelles de l'interface historique.
 */
import { SEMESTRES } from "./constituer";
import { semestresDeLAnnee } from "./evaluation";

/** Une promotion connue, et ce qu'il faut savoir d'elle pour la proposer. */
export interface PromotionCandidate<P> {
  readonly promotion: P;
  /** Année de formation à l'année scolaire en cours (0 avant l'entrée). */
  readonly annee: number;
  readonly duree: number;
  /** Rang de son diplôme, -1 s'il est inconnu. */
  readonly rangDiplome: number;
  readonly debut: number;
  /** Fait-elle partie de la répartition de service de « C'est moi » ? */
  readonly mienne: boolean;
}

/**
 * Promotions proposées : avec « C'est moi » et au moins une affectation, ses
 * promotions entrées en formation, terminées comprises (ses étudiants et
 * anciens étudiants) ; sinon, les promotions en cours. Rangées par diplôme,
 * puis de la plus récente à la plus ancienne.
 *
 * @param moiDefini « C'est moi » est-il défini ?
 */
export function promotionsSuivies<P>(
  candidates: readonly PromotionCandidate<P>[],
  moiDefini: boolean,
): { promotions: P[]; seulementMiennes: boolean; nombreMiennes: number } {
  const entrees = candidates.filter((candidate) => candidate.annee >= 1);
  const nombreMiennes = entrees.filter((candidate) => moiDefini && candidate.mienne).length;
  const seulementMiennes = moiDefini && nombreMiennes > 0;
  const promotions = entrees
    .filter((candidate) => (seulementMiennes ? candidate.mienne : candidate.annee <= candidate.duree))
    .sort((a, b) => a.rangDiplome - b.rangDiplome || b.debut - a.debut)
    .map((candidate) => candidate.promotion);
  return { promotions, seulementMiennes, nombreMiennes };
}

/**
 * Semestres proposés pour une promotion : jusqu'au dernier de son année de
 * formation ; le semestre courant est celui du moment dans l'année, ou le
 * dernier pour une promotion terminée.
 *
 * @param rangSemestre 1 ou 2, selon la date et le calendrier de l'établissement
 */
export function semestresProgression(anneeFormation: number, duree: number, rangSemestre: number): { semestres: string[]; courant: string } {
  const terminee = anneeFormation > duree;
  const semestresAnnee = semestresDeLAnnee(Math.min(duree, anneeFormation));
  const dernier = semestresAnnee.at(-1) ?? "";
  const courant = terminee ? dernier : (semestresAnnee[rangSemestre - 1] ?? semestresAnnee[0] ?? "");
  return { semestres: SEMESTRES.slice(0, SEMESTRES.indexOf(dernier as (typeof SEMESTRES)[number]) + 1), courant };
}

interface LigneCompetence {
  readonly c: { readonly bloc?: unknown };
  readonly inSem: readonly unknown[];
}

/** Compétences retenues par le filtre : toutes, à évaluer (aucune évaluation au semestre) ou évaluées. */
export function lignesAffichees<L extends LigneCompetence>(lignes: readonly L[], filtre: string): L[] {
  return lignes.filter((ligne) => filtre === "tout" || (filtre === "todo" ? ligne.inSem.length === 0 : ligne.inSem.length > 0));
}

/** Blocs des compétences affichées, rangés par numéro. */
export function blocsAffiches(lignes: readonly LigneCompetence[]): string[] {
  return [...new Set(lignes.map((ligne) => String(ligne.c.bloc)))].sort((a, b) => Number(a) - Number(b));
}

/** Dans un bloc, les compétences à évaluer d'abord. */
export function ordreDansLeBloc<L extends LigneCompetence>(lignes: readonly L[]): L[] {
  return lignes.slice().sort((a, b) => (a.inSem.length > 0 ? 1 : 0) - (b.inSem.length > 0 ? 1 : 0));
}

/** Part des compétences évaluées, arrondie ; zéro sans compétence. */
export function pourcentage(nombre: number, total: number): number {
  return total > 0 ? Math.round((nombre / total) * 100) : 0;
}
