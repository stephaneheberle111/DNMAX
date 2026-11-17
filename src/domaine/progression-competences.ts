// SPDX-License-Identifier: CECILL-2.1
/**
 * Étape « Compétences » de l'éditeur : où en est la promotion sur chaque
 * compétence du semestre, d'après ses autres évaluations enregistrées.
 * Calculs seuls.
 */

/** Ce qui est lu d'une évaluation : son semestre, ses compétences, les niveaux saisis. */
export interface EvaluationLue {
  readonly semestre?: unknown;
  readonly items?: unknown;
  readonly res?: unknown;
}

/**
 * - `todo` : jamais évaluée ;
 * - `autre` : évaluée à un autre semestre seulement ;
 * - `prevue` : une évaluation du semestre la retient, aucune n'est encore évaluée ;
 * - `part` : évaluée au semestre, mais pas encore pour tous les étudiants (module Étudiants) ;
 * - `ok` : évaluée au semestre.
 */
export type EtatCompetence = "todo" | "autre" | "prevue" | "part" | "ok";

export interface ProgressionCompetence<E extends EvaluationLue> {
  /** Évaluations du semestre qui retiennent la compétence. */
  readonly auSemestre: readonly E[];
  /** Toutes les évaluations qui la retiennent, quel que soit le semestre. */
  readonly partout: readonly E[];
  /** Étudiants qui ont un niveau saisi sur elle au semestre. */
  readonly faits: number;
  readonly total: number;
  readonly etat: EtatCompetence;
}

export interface DonneesProgression<E extends EvaluationLue> {
  readonly codes: readonly string[];
  readonly semestre: string;
  /** Autres évaluations enregistrées de la ou des promotions (ni l'évaluation en cours, ni les brouillons). */
  readonly evaluations: readonly E[];
  readonly idsEtudiants: readonly string[];
  /** Vrai si l'évaluation est au moins « Évaluée » dans son suivi. */
  readonly estEvaluee: (evaluation: E) => boolean;
  readonly moduleEleves: boolean;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function competences(evaluation: EvaluationLue): { code: string; op: string }[] {
  if (!Array.isArray(evaluation.items)) return [];
  return evaluation.items.filter(estObjet).map((item) => ({
    code: typeof item.code === "string" ? item.code : "",
    op: typeof item.op === "string" ? item.op : "",
  }));
}

/** Étudiants qui ont un niveau saisi sur la ligne de la compétence, dans ces évaluations. */
function etudiantsEvalues(evaluations: readonly EvaluationLue[], code: string): Set<string> {
  const vus = new Set<string>();
  for (const evaluation of evaluations) {
    const resultats = estObjet(evaluation.res) ? evaluation.res : {};
    for (const competence of competences(evaluation).filter((candidate) => candidate.code === code)) {
      const cle = competence.op === "" ? `one:${code}` : `op:${competence.op}`;
      for (const [id, resultat] of Object.entries(resultats)) {
        const niveaux = estObjet(resultat) && estObjet(resultat.n) ? resultat.n : {};
        const niveau = niveaux[cle];
        if (niveau !== undefined && niveau !== null && niveau !== "") vus.add(id);
      }
    }
  }
  return vus;
}

/** Progression de la promotion sur chaque compétence de `codes`. */
export function progressionDesCompetences<E extends EvaluationLue>(donnees: DonneesProgression<E>): Record<string, ProgressionCompetence<E>> {
  const progression: Record<string, ProgressionCompetence<E>> = {};
  for (const code of donnees.codes) {
    const partout = donnees.evaluations.filter((evaluation) => competences(evaluation).some((competence) => competence.code === code));
    const auSemestre = partout.filter((evaluation) => evaluation.semestre === donnees.semestre);
    const vus = etudiantsEvalues(auSemestre, code);
    const faits = donnees.idsEtudiants.filter((id) => vus.has(id)).length;
    const total = donnees.idsEtudiants.length;
    let etat: EtatCompetence;
    if (auSemestre.length === 0) {
      etat = partout.length > 0 ? "autre" : "todo";
    } else if (!auSemestre.some((evaluation) => donnees.estEvaluee(evaluation))) {
      etat = "prevue";
    } else {
      etat = donnees.moduleEleves && total > 0 && faits < total ? "part" : "ok";
    }
    progression[code] = { auSemestre, partout, faits, total, etat };
  }
  return progression;
}

/** Filtre « Toutes / À évaluer / Déjà évaluées » : une compétence sans progression connue passe toujours. */
export function passeLeFiltre(progression: ProgressionCompetence<EvaluationLue> | undefined, filtre: "tout" | "todo" | "fait"): boolean {
  if (filtre === "tout" || progression === undefined) return true;
  return filtre === "todo" ? progression.auSemestre.length === 0 : progression.auSemestre.length > 0;
}
