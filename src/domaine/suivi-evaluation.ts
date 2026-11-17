// SPDX-License-Identifier: CECILL-2.1
/**
 * Suivi d'une évaluation : préparée, distribuée, rendue, évaluée, restituée.
 * Le statut n'est jamais saisi : il découle de ce qui a été fait sur
 * l'évaluation (dates, saisie des étudiants, restitutions). Calculs seuls.
 */

export type StatutSuivi = "brouillon" | "annulee" | "prep" | "distrib" | "rendu" | "evalcours" | "eval" | "restpart" | "restit";

/** Ordre des statuts, pour comparer (« au moins évaluée »). Un brouillon n'a pas de rang. */
export const RANGS_STATUT: Readonly<Record<Exclude<StatutSuivi, "brouillon">, number>> = {
  annulee: -1,
  prep: 0,
  distrib: 1,
  rendu: 1,
  evalcours: 2,
  eval: 3,
  restpart: 4,
  restit: 5,
};

export const LIBELLES_STATUT: Readonly<Record<StatutSuivi, string>> = {
  brouillon: "Brouillon",
  prep: "Préparée",
  distrib: "Distribuée",
  rendu: "Rendus à évaluer",
  evalcours: "Évaluation en cours",
  eval: "Évaluée",
  restpart: "Restituée en partie",
  restit: "Restituée",
  annulee: "Annulée",
};

/** Les cinq étapes de la frise du suivi. */
export const ETAPES_FRISE = ["Préparée", "Distribuée", "Rendue", "Évaluée", "Restituée"] as const;

/** Place d'un statut dans la frise : étape (de 0 à 4, -1 pour annulée) et vrai si elle n'est que commencée. */
export const POSITIONS_FRISE: Readonly<Partial<Record<StatutSuivi, readonly [number, 0 | 1]>>> = {
  prep: [0, 0],
  distrib: [1, 0],
  rendu: [2, 0],
  evalcours: [3, 1],
  eval: [3, 0],
  restpart: [4, 1],
  restit: [4, 0],
  annulee: [-1, 0],
};

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function vrai(valeur: unknown): boolean {
  return valeur !== undefined && valeur !== null && valeur !== false && valeur !== "" && valeur !== 0;
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

/**
 * Où en est la saisie dans DNMAX (module Étudiants) : étudiants commencés,
 * complets, et total. Un étudiant non rendu ou dispensé compte comme complet :
 * il n'y a rien à saisir pour lui.
 */
export function avancementSaisie(evaluation: unknown, idsEtudiants: readonly string[]): { any: number; full: number; tot: number } {
  const lue = estObjet(evaluation) ? evaluation : {};
  const items = Array.isArray(lue.items) ? lue.items.filter(estObjet) : [];
  const cles = [...new Set(items.map((item) => (vrai(item.op) ? `op:${texte(item.op)}` : `one:${texte(item.code)}`)))];
  const resultats = estObjet(lue.res) ? lue.res : {};
  let any = 0;
  let full = 0;
  for (const id of idsEtudiants) {
    const resultat = estObjet(resultats[id]) ? resultats[id] : {};
    if (vrai(resultat.nr) || vrai(resultat.disp)) {
      any++;
      full++;
      continue;
    }
    const niveaux = estObjet(resultat.n) ? resultat.n : {};
    const saisies = cles.filter((cle) => niveaux[cle] !== undefined && niveaux[cle] !== null && niveaux[cle] !== "").length;
    if (saisies > 0) any++;
    if (cles.length > 0 && saisies >= cles.length) full++;
  }
  return { any, full, tot: idsEtudiants.length };
}

/** Étudiants à qui l'évaluation a été restituée (module Étudiants), et total. */
export function restitutionsEtudiants(evaluation: unknown, idsEtudiants: readonly string[]): { n: number; tot: number } {
  const lue = estObjet(evaluation) ? evaluation : {};
  const resultats = estObjet(lue.res) ? lue.res : {};
  return {
    n: idsEtudiants.filter((id) => {
      const resultat = resultats[id];
      return estObjet(resultat) && vrai(resultat.rest);
    }).length,
    tot: idsEtudiants.length,
  };
}

/** Promotions visées : la liste `classes`, sinon l'ancienne promotion unique `classe`. */
export function promotionsVisees(evaluation: unknown): string[] {
  const lue = estObjet(evaluation) ? evaluation : {};
  const classes = Array.isArray(lue.classes) && lue.classes.length > 0 ? lue.classes : [lue.classe];
  return classes.filter((nom): nom is string => typeof nom === "string" && nom !== "");
}

export interface SituationSuivi {
  /** Date du jour, au format AAAA-MM-JJ. */
  readonly aujourdhui: string;
  readonly moduleEleves: boolean;
  /** Étudiants de l'évaluation (vide sans le module Étudiants). */
  readonly idsEtudiants: readonly string[];
}

/**
 * Statut d'une évaluation, du plus avancé au moins avancé :
 * - restituée (en partie) : restitution marquée pour la ou les promotions, ou, avec le module Étudiants, pour chaque étudiant ;
 * - évaluée : tous les étudiants saisis dans DNMAX, ou évaluation marquée terminée (évaluation à la main) ;
 * - évaluation en cours : au moins un étudiant saisi, ou grille exportée (sans module Étudiants) ;
 * - rendus à évaluer, puis distribuée : la date prévue est passée, ou l'étape est marquée faite ;
 * - préparée, sinon.
 */
export function statutEvaluation(evaluation: unknown, situation: SituationSuivi): StatutSuivi {
  const lue = estObjet(evaluation) ? evaluation : {};
  if (vrai(lue.brouillon)) return "brouillon";
  if (vrai(lue.annulee)) return "annulee";
  const suivi = estObjet(lue.suivi) ? lue.suivi : {};
  const promotions = promotionsVisees(lue);
  const restitutions = estObjet(lue.restit) ? lue.restit : {};
  const promotionsRestituees = promotions.filter((nom) => vrai(restitutions[nom])).length;
  const etudiants = situation.moduleEleves ? restitutionsEtudiants(lue, situation.idsEtudiants) : { n: 0, tot: 0 };
  if (vrai(suivi.restitue) || (promotions.length > 0 && promotionsRestituees === promotions.length) || (etudiants.tot > 0 && etudiants.n >= etudiants.tot)) {
    return "restit";
  }
  if (promotionsRestituees > 0 || etudiants.n > 0) return "restpart";
  const saisie = situation.moduleEleves ? avancementSaisie(lue, situation.idsEtudiants) : { any: 0, full: 0, tot: 0 };
  if (vrai(suivi.evalue) || (saisie.tot > 0 && saisie.full >= saisie.tot)) return "eval";
  if (vrai(suivi.evalDebut) || saisie.any > 0 || (!situation.moduleEleves && vrai(suivi.exporte))) return "evalcours";
  const distribution = texte(lue.distribPrev);
  const rendu = texte(lue.renduPrev) || texte(suivi.butoir);
  if (vrai(suivi.rendu) || (rendu !== "" && rendu <= situation.aujourdhui)) return "rendu";
  if (vrai(suivi.distrib) || (distribution !== "" && distribution <= situation.aujourdhui)) return "distrib";
  return "prep";
}

/** Vrai si l'évaluation est au moins évaluée (un brouillon ne l'est jamais). */
export function estEvaluee(statut: StatutSuivi): boolean {
  return statut !== "brouillon" && RANGS_STATUT[statut] >= RANGS_STATUT.eval;
}
