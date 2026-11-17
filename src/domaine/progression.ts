// SPDX-License-Identifier: CECILL-2.1
/**
 * Page Progression : ce que les évaluations enregistrées d'une promotion
 * couvrent au semestre, et, pour un étudiant (module Étudiants), son
 * avancement et l'évolution de son niveau sur chaque compétence. Calculs seuls.
 */
import { cleLigne, lignesDe } from "./evaluation";

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

function vrai(valeur: unknown): boolean {
  return valeur !== undefined && valeur !== null && valeur !== false && valeur !== "" && valeur !== 0;
}

/** Ce qui est lu d'une évaluation enregistrée. */
export interface EvaluationProgression {
  readonly semestre?: unknown;
  readonly date?: unknown;
  readonly niveaux?: unknown;
  readonly items?: unknown;
  readonly ops?: unknown;
  readonly res?: unknown;
  readonly distribPrev?: unknown;
  readonly suivi?: unknown;
}

/**
 * Ramène un niveau saisi sur l'échelle d'une évaluation (`nombreEvaluation`
 * niveaux, ou l'échelle de référence si elle n'en dit rien) à l'échelle de
 * référence (`nombreReference` niveaux).
 */
export function niveauNormalise(niveau: unknown, nombreEvaluation: number, nombreReference: number): number {
  const nombre = nombreEvaluation || nombreReference;
  return Math.round((Number(niveau) / Math.max(1, nombre - 1)) * (nombreReference - 1));
}

function nombreNiveaux(evaluation: EvaluationProgression): number {
  return Array.isArray(evaluation.niveaux) ? evaluation.niveaux.length : 0;
}

function niveauxSaisis(resultat: unknown): Record<string, unknown> {
  return estObjet(resultat) && estObjet(resultat.n) ? resultat.n : {};
}

function renseigne(niveaux: Record<string, unknown>, cle: string): boolean {
  return niveaux[cle] !== undefined && niveaux[cle] !== null && niveaux[cle] !== "";
}

/** Clés des lignes qui portent la compétence `code` dans l'évaluation. */
function clesDeLaCompetence(evaluation: EvaluationProgression, code: string): string[] {
  if (!Array.isArray(evaluation.items)) return [];
  return evaluation.items
    .filter(estObjet)
    .filter((item) => item.code === code)
    .map((item) => (vrai(item.op) ? `op:${texte(item.op)}` : `one:${code}`));
}

function retient(evaluation: EvaluationProgression, code: string): boolean {
  return clesDeLaCompetence(evaluation, code).length > 0;
}

/**
 * - `todo` : jamais évaluée ; `autre` : vue à un autre semestre seulement ;
 * - `prevue` : une évaluation du semestre la retient, aucune n'est encore évaluée ;
 * - `part` : évaluée au semestre, mais pas encore pour tous les étudiants ;
 * - `ok` : évaluée au semestre.
 */
export type EtatProgression = "todo" | "autre" | "prevue" | "part" | "ok";

export interface ProgressionPromotion<E extends EvaluationProgression> {
  readonly partout: readonly E[];
  readonly auSemestre: readonly E[];
  /** Étudiants qui ont un niveau sur la compétence au semestre. */
  readonly faits: number;
  /** Nombre d'étudiants par niveau (dernier niveau connu de chacun, sur l'échelle de référence). */
  readonly repartition: readonly number[];
  readonly etat: EtatProgression;
}

export interface DonneesPromotion<E extends EvaluationProgression> {
  readonly codes: readonly string[];
  readonly semestre: string;
  /** Évaluations enregistrées de la promotion (sans les brouillons). */
  readonly evaluations: readonly E[];
  readonly idsEtudiants: readonly string[];
  /** Nombre de niveaux de l'échelle de référence. */
  readonly nombreNiveaux: number;
  readonly estEvaluee: (evaluation: E) => boolean;
  readonly moduleEleves: boolean;
}

/**
 * Pour chaque compétence attendue au semestre : les évaluations qui la
 * retiennent, et le dernier niveau connu de chaque étudiant (les évaluations
 * les plus récentes l'emportent).
 */
export function progressionPromotion<E extends EvaluationProgression>(donnees: DonneesPromotion<E>): Record<string, ProgressionPromotion<E>> {
  const { idsEtudiants, nombreNiveaux: reference } = donnees;
  const resultat: Record<string, ProgressionPromotion<E>> = {};
  for (const code of donnees.codes) {
    const partout = donnees.evaluations.filter((evaluation) => retient(evaluation, code));
    const auSemestre = partout.filter((evaluation) => evaluation.semestre === donnees.semestre);
    const dernier: Record<string, number> = {};
    for (const evaluation of [...auSemestre].sort((a, b) => texte(a.date).localeCompare(texte(b.date)))) {
      const resultats = estObjet(evaluation.res) ? evaluation.res : {};
      for (const cle of clesDeLaCompetence(evaluation, code)) {
        for (const [id, resultatEtudiant] of Object.entries(resultats)) {
          const niveaux = niveauxSaisis(resultatEtudiant);
          if (renseigne(niveaux, cle)) dernier[id] = niveauNormalise(niveaux[cle], nombreNiveaux(evaluation), reference);
        }
      }
    }
    const faits = idsEtudiants.filter((id) => dernier[id] !== undefined).length;
    const repartition = Array.from({ length: reference }, (_, rang) => idsEtudiants.filter((id) => dernier[id] === rang).length);
    let etat: EtatProgression;
    if (auSemestre.length === 0) {
      etat = partout.length > 0 ? "autre" : "todo";
    } else if (!auSemestre.some((evaluation) => donnees.estEvaluee(evaluation))) {
      etat = "prevue";
    } else {
      // Avec le module Étudiants, une promotion sans étudiant reste « en cours ».
      etat = !donnees.moduleEleves || (idsEtudiants.length > 0 && faits >= idsEtudiants.length) ? "ok" : "part";
    }
    resultat[code] = { partout, auSemestre, faits, repartition, etat };
  }
  return resultat;
}

/**
 * Où en est un étudiant dans une évaluation du semestre :
 * dispensé, non rendu, évalué, évaluation partielle, non évalué alors que
 * d'autres l'ont été (`miss`), ou pas encore évaluée pour personne (`wait`).
 */
export type EtatEtudiantEvaluation = "disp" | "nr" | "ok" | "part" | "miss" | "wait";

export function etatEtudiantDansEvaluation(
  resultat: unknown,
  cles: readonly string[],
  etudiantsCommences: number,
): { etat: EtatEtudiantEvaluation; lignesSaisies: number } {
  const lu = estObjet(resultat) ? resultat : {};
  const niveaux = niveauxSaisis(lu);
  const lignesSaisies = cles.filter((cle) => renseigne(niveaux, cle)).length;
  // Parmi les étudiants commencés, l'étudiant lui-même s'il est saisi ou non rendu.
  const autres = etudiantsCommences - (lignesSaisies > 0 || vrai(lu.nr) ? 1 : 0);
  const etat: EtatEtudiantEvaluation = vrai(lu.disp)
    ? "disp"
    : vrai(lu.nr)
      ? "nr"
      : cles.length > 0 && lignesSaisies >= cles.length
        ? "ok"
        : lignesSaisies > 0
          ? "part"
          : autres > 0
            ? "miss"
            : "wait";
  return { etat, lignesSaisies };
}

/** Date d'une évaluation pour l'ordre chronologique : distribution prévue, sinon faite, sinon saisie. */
export function dateDeLEvaluation(evaluation: EvaluationProgression): string {
  const suivi = estObjet(evaluation.suivi) ? evaluation.suivi : {};
  return texte(evaluation.distribPrev) || texte(suivi.distrib) || texte(evaluation.date);
}

/** Un niveau obtenu par l'étudiant sur une compétence, dans une évaluation. */
export interface PointTrajectoire<E> {
  readonly evaluation: E;
  readonly niveau: number;
  readonly date: string;
  readonly semestre: string;
}

/**
 * Niveaux successifs de l'étudiant sur chaque compétence, par ordre de date.
 * Les évaluations où il est non rendu ou dispensé sont ignorées si `sansAbsences`.
 */
export function trajectoires<E extends EvaluationProgression>(
  evaluations: readonly E[],
  idEtudiant: string,
  reference: number,
  sansAbsences = false,
): Record<string, PointTrajectoire<E>[]> {
  const parCompetence: Record<string, PointTrajectoire<E>[]> = {};
  for (const evaluation of evaluations) {
    const resultats = estObjet(evaluation.res) ? evaluation.res : {};
    const resultat = resultats[idEtudiant];
    if (!estObjet(resultat) || !estObjet(resultat.n)) continue;
    if (sansAbsences && (vrai(resultat.nr) || vrai(resultat.disp))) continue;
    const niveaux = resultat.n;
    for (const ligne of lignesDe(evaluation)) {
      const cle = cleLigne(ligne);
      if (!renseigne(niveaux, cle)) continue;
      const niveau = niveauNormalise(niveaux[cle], nombreNiveaux(evaluation), reference);
      const codes = ligne.regroupement === null ? [ligne.competence.code] : ligne.competences.map((competence) => competence.code);
      for (const code of codes) {
        (parCompetence[code] ??= []).push({ evaluation, niveau, date: dateDeLEvaluation(evaluation), semestre: texte(evaluation.semestre) });
      }
    }
  }
  for (const points of Object.values(parCompetence)) points.sort((a, b) => a.date.localeCompare(b.date));
  return parCompetence;
}

/** Dernier niveau connu de l'étudiant sur chaque compétence (évaluations triées par date, non rendus et dispenses ignorés). */
export function derniersNiveaux(evaluations: readonly EvaluationProgression[], idEtudiant: string, reference: number): Record<string, number> {
  const triees = [...evaluations].sort((a, b) => dateDeLEvaluation(a).localeCompare(dateDeLEvaluation(b)));
  const derniers: Record<string, number> = {};
  for (const evaluation of triees) {
    const parCompetence = trajectoires([evaluation], idEtudiant, reference, true);
    for (const [code, points] of Object.entries(parCompetence)) {
      const point = points[points.length - 1];
      if (point !== undefined) derniers[code] = point.niveau;
    }
  }
  return derniers;
}

/**
 * Situe le niveau d'un étudiant par rapport à la moyenne de la classe
 * (arrondie au niveau le plus proche). `null` s'il y a moins de deux niveaux connus dans la classe.
 */
export function positionDansLaClasse(niveau: number, niveauxClasse: readonly (number | undefined)[]): { moyenne: number; ecart: number; nombre: number } | null {
  const connus = niveauxClasse.filter((valeur): valeur is number => valeur !== undefined);
  if (connus.length < 2) return null;
  const moyenne = Math.round(connus.reduce((a, b) => a + b, 0) / connus.length);
  return { moyenne, ecart: niveau - moyenne, nombre: connus.length };
}
