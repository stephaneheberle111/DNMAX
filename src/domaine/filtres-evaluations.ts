// SPDX-License-Identifier: CECILL-2.1
/**
 * Mes évaluations : les filtres de la liste (promotions, semestres, suivi,
 * intitulé). Par défaut, les promotions en cours. Un enseignant voit
 * d'emblée les promotions de sa répartition de service et les évaluations
 * dont il est l'enseignant ; les autres promotions restent accessibles en les
 * choisissant dans le filtre.
 */
import { SEMESTRES } from "./constituer";

type Element = Record<string, unknown>;

/** Filtres de la liste ; une liste vide ne filtre pas, « cur » vaut toutes les promotions en cours. */
export interface Filtres {
  per: string[];
  mine: boolean;
  sem: string[];
  st: string[];
  q: string;
}

export function filtresParDefaut(): Filtres {
  return { per: ["cur"], mine: true, sem: [], st: [], q: "" };
}

/** Un filtre est posé dès que les réglages s'écartent de ceux par défaut. */
export function filtresActifs(filtres: Filtres): boolean {
  return JSON.stringify(filtres) !== JSON.stringify(filtresParDefaut());
}

/** Ramène, sur place, une ancienne valeur unique à une liste ; « all » ou une valeur vide ne filtrent pas. */
export function normaliserFiltres(filtres: Record<string, unknown>): Filtres {
  for (const cle of ["per", "sem", "st"]) {
    const valeur = filtres[cle];
    if (!Array.isArray(valeur)) filtres[cle] = valeur !== undefined && valeur !== null && valeur !== "" && valeur !== false && valeur !== 0 && valeur !== "all" ? [valeur] : [];
  }
  return filtres as unknown as Filtres;
}

/** Enseignants d'une évaluation : la liste, ou à défaut l'ancien champ texte « A, B ». */
export function profsDe(evaluation: Element): string[] {
  if (Array.isArray(evaluation.profs) && evaluation.profs.length > 0) return evaluation.profs as string[];
  return (typeof evaluation.prof === "string" ? evaluation.prof : "").split(/,\s*/).filter((nom) => nom !== "");
}

/** Ce que les filtres demandent à l'établissement. */
export interface OutilsFiltres {
  /** Promotions de la répartition de service de « C'est moi », ou `null` si tout reste visible. */
  readonly visibles: ReadonlySet<unknown> | null;
  promotionsDe(evaluation: Element): readonly Element[];
  enCours(promotion: Element): boolean;
  /** Nom de « C'est moi ». */
  readonly moi: string;
  statut(evaluation: Element): string;
}

export function correspondFiltres(evaluation: Element, filtres: Filtres, outils: OutilsFiltres): boolean {
  if (outils.visibles !== null) {
    const visibles = outils.visibles;
    const promotions = outils.promotionsDe(evaluation);
    const mienne = promotions.some((promotion) => visibles.has(promotion.id)) || profsDe(evaluation).includes(outils.moi);
    // Une promotion hors de ma répartition reste accessible : ses évaluations se montrent quand je la choisis moi-même.
    const choisie = promotions.some((promotion) => filtres.per.includes(String(promotion.id)));
    if (!mienne && !choisie) return false;
  }
  if (filtres.per.length > 0) {
    const promotions = outils.promotionsDe(evaluation);
    const enCours = filtres.per.includes("cur") && (promotions.length === 0 || promotions.some((promotion) => outils.enCours(promotion)));
    if (!enCours && !promotions.some((promotion) => filtres.per.includes(String(promotion.id)))) return false;
  }
  if (filtres.sem.length > 0 && !filtres.sem.includes(String(evaluation.semestre))) return false;
  if (filtres.st.length > 0 && !filtres.st.includes(outils.statut(evaluation))) return false;
  const titre = typeof evaluation.titre === "string" ? evaluation.titre : "";
  return filtres.q === "" || titre.toLowerCase().includes(filtres.q.toLowerCase());
}

/** Résumé d'un filtre, affiché sur son bouton. */
export function resumeFiltre(
  cle: "per" | "sem" | "st",
  valeurs: readonly string[],
  noms: { nomPromotion(id: string): string; libelleStatut(cle: string): string },
): string {
  if (cle === "per") {
    if (valeurs.length === 0) return "Toutes les promotions";
    const libelles = valeurs.map((valeur) => (valeur === "cur" ? "En cours" : noms.nomPromotion(valeur)));
    return libelles.length <= 2 ? libelles.join(", ") : `${String(libelles.length)} sélections`;
  }
  if (cle === "sem") return valeurs.length > 0 ? SEMESTRES.filter((semestre) => valeurs.includes(semestre)).join(", ") : "Tous les semestres";
  if (valeurs.length === 0) return "Tous les suivis";
  return valeurs.length === 1 ? noms.libelleStatut(valeurs[0] ?? "") : `${String(valeurs.length)} suivis`;
}
