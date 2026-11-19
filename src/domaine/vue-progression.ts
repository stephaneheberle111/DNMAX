// SPDX-License-Identifier: CECILL-2.1
/**
 * Progression : quelles promotions et quels semestres proposer, et comment
 * ranger les compétences de la vue « Promotion ». Les calculs de couverture
 * et de niveaux sont dans `domaine/progression`. Règles reprises telles
 * quelles de l'ancienne interface.
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

/** Évaluations du semestre d'un étudiant, par état. */
export interface ComptesEtudiant {
  readonly part: number;
  readonly nr: number;
  readonly disp: number;
  readonly miss: number;
  readonly wait: number;
}

function accord(nombre: number, singulier: string, pluriel: string): string {
  return `${String(nombre)} ${nombre > 1 ? pluriel : singulier}`;
}

/** Ce qui reste en retard au semestre pour l'étudiant ; à défaut, « Rien en retard. » ou l'absence d'évaluation. */
export function resumeAvancement(comptes: ComptesEtudiant, total: number, semestre: string): { texte: string; gras: boolean }[] {
  const morceaux = [
    comptes.part > 0 ? { texte: accord(comptes.part, "partielle", "partielles"), gras: false } : null,
    comptes.nr > 0 ? { texte: accord(comptes.nr, "non rendu", "non rendus"), gras: true } : null,
    comptes.disp > 0 ? { texte: accord(comptes.disp, "dispensée", "dispensées"), gras: false } : null,
    comptes.miss > 0 ? { texte: `${accord(comptes.miss, "non évaluée", "non évaluées")} alors que d'autres étudiants l'ont été`, gras: true } : null,
    comptes.wait > 0 ? { texte: `${accord(comptes.wait, "pas encore évaluée", "pas encore évaluées")} (pour personne)`, gras: false } : null,
  ].filter((morceau): morceau is { texte: string; gras: boolean } => morceau !== null);
  if (morceaux.length > 0) return morceaux;
  return [{ texte: total > 0 ? "Rien en retard." : `Aucune évaluation au ${semestre} pour cet étudiant.`, gras: false }];
}

/**
 * Écart de l'étudiant à la moyenne de la classe : signalé à partir d'un
 * demi-point, jamais pour les rendus.
 *
 * @param mauvais vrai si un nombre plus haut est défavorable (non-rendus, dispenses)
 */
export function ecartALaClasse(cle: string, valeur: number, moyenne: number, mauvais: boolean): string {
  const ecart = valeur - moyenne;
  if (cle === "rendu" || Math.abs(ecart) < 0.5) return "";
  return (mauvais ? ecart > 0 : ecart < 0) ? " warn" : " good";
}

/** Évolution du niveau, de la première à la dernière évaluation. */
export function tendance(niveaux: readonly number[]): string {
  if (niveaux.length <= 1) return "1 évaluation";
  const premier = niveaux[0] ?? 0;
  const dernier = niveaux.at(-1) ?? 0;
  return `${dernier > premier ? "en progrès" : dernier < premier ? "en recul" : "stable"} sur ${String(niveaux.length)} évaluations`;
}

/** Flèche entre deux niveaux successifs. */
export function fleche(precedent: number, niveau: number): string {
  return niveau > precedent ? "↗" : niveau < precedent ? "↘" : "→";
}

/** Année du dernier niveau d'acquisition atteint (niveau de maîtrise au seuil ou mieux), 0 sinon. */
export function palier(trajectoire: readonly { annee: number; niveau: number }[], seuil: number): number {
  const atteints = trajectoire.filter((etape) => etape.niveau >= seuil);
  return atteints.length > 0 ? Math.max(...atteints.map((etape) => etape.annee)) : 0;
}

/** État d'une année pour les niveaux d'acquisition : atteint, évalué sans le seuil, à venir, ou pas encore évalué. */
export function etatAnnee(trajectoire: readonly { annee: number; niveau: number }[], annee: number, seuil: number, anneeCourante: number): { classe: string; texte: string } {
  const atteint = trajectoire.some((etape) => etape.annee === annee && etape.niveau >= seuil);
  const vu = trajectoire.some((etape) => etape.annee === annee);
  const avenir = annee > anneeCourante;
  return {
    classe: (atteint ? " ok" : vu ? " seen" : "") + (avenir ? " fut" : ""),
    texte: atteint ? "atteint" : vu ? "évalué, maîtrise pas encore suffisante" : avenir ? "année à venir" : "pas encore évalué cette année",
  };
}
