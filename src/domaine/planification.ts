// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Constituer, étape 4 : la planification par semestre, où
 * chaque compétence se rattache aux EC qui la portent, semestre par
 * semestre. Règles reprises telles quelles de l'ancienne interface ; les
 * compétences sont modifiées sur place, comme elle les tient.
 */
import { ordreEc, SEMESTRES } from "./constituer";

type Element = Record<string, unknown>;

/** Une UE et ses EC, dans l'ordre de leurs codes. */
export interface GroupePlanification {
  readonly ue: Element;
  readonly ecs: Element[];
}

function semestresDe(element: Element): string[] {
  return Array.isArray(element.sems) ? (element.sems as string[]) : [];
}

/**
 * EC regroupés par UE, rangés par code ; les EC dont l'UE n'est pas dans le
 * référentiel forment un groupe « Sans unité ». Pour un semestre, seuls les
 * EC ouverts ce semestre restent, et les UE qui n'en ont plus disparaissent.
 */
export function groupesPlanification(ues: readonly Element[], ecs: readonly Element[], semestre: string): GroupePlanification[] {
  const groupes: GroupePlanification[] = ues.map((ue) => ({ ue, ecs: ecs.filter((ec) => ec.ueId === ue.id).sort((a, b) => ordreEc(a) - ordreEc(b)) }));
  const orphelins = ecs.filter((ec) => !ues.some((ue) => ue.id === ec.ueId));
  if (orphelins.length > 0) groupes.push({ ue: { id: "", nom: "Sans unité", couleur: "#9aa2ae" }, ecs: orphelins });
  return groupes
    .map((groupe) => ({ ue: groupe.ue, ecs: groupe.ecs.filter((ec) => semestre === "" || semestresDe(ec).includes(semestre)) }))
    .filter((groupe) => groupe.ecs.length > 0);
}

/** Semestres d'un EC montrés en colonnes : ceux qu'il ouvre, réduits au semestre choisi. */
export function semestresAffiches(ec: Element, semestre: string): string[] {
  return SEMESTRES.filter((candidat) => semestresDe(ec).includes(candidat) && (semestre === "" || candidat === semestre));
}

/** Une colonne de la grille : un EC à un semestre (vide pour un EC sans semestre). */
export interface ColonnePlanification {
  readonly ue: Element;
  readonly ec: Element;
  readonly semestre: string;
  /** Un EC sur deux est teinté, pour les distinguer. */
  readonly alterne: boolean;
  /** Dernière colonne de l'EC. */
  readonly finEc: boolean;
  /** Dernière colonne de l'UE. */
  readonly finUe: boolean;
}

export function colonnesPlanification(groupes: readonly GroupePlanification[], semestre: string): ColonnePlanification[] {
  const brutes: Omit<ColonnePlanification, "finUe">[] = [];
  let rangEc = 0;
  for (const groupe of groupes) {
    for (const ec of groupe.ecs) {
      const semestres = semestresAffiches(ec, semestre);
      const liste = semestres.length > 0 ? semestres : [""];
      liste.forEach((sem, rang) => {
        brutes.push({ ue: groupe.ue, ec, semestre: sem, alterne: rangEc % 2 === 1, finEc: rang === liste.length - 1 });
      });
      rangEc += 1;
    }
  }
  return brutes.map((colonne, rang) => {
    const suivante = brutes[rang + 1];
    return { ...colonne, finUe: colonne.finEc && (suivante === undefined || suivante.ue.id !== colonne.ue.id) };
  });
}

/** Blocs rangés par numéro ; un numéro qui n'est pas un nombre compte pour zéro. */
export function blocsPlanification(blocs: readonly Element[]): Element[] {
  const numero = (bloc: Element): number => Number(bloc.num) || 0;
  return blocs.slice().sort((a, b) => numero(a) - numero(b));
}

function liensDe(competence: Element): Element[] {
  return Array.isArray(competence.ecs) ? (competence.ecs as Element[]) : [];
}

/** Rattachements de la compétence visibles dans les colonnes (EC présent à un semestre coché). */
export function liensVisibles(competence: Element, colonnes: readonly ColonnePlanification[]): number {
  return liensDe(competence).filter((lien) =>
    colonnes.some((colonne) => colonne.ec.id === lien.id && colonne.semestre !== "" && semestresDe(lien).includes(colonne.semestre)),
  ).length;
}

/** Rattachement de la compétence à un EC, ou `null`. */
export function lienEc(competence: Element, idEc: unknown): Element | null {
  return liensDe(competence).find((lien) => lien.id === idEc) ?? null;
}

/**
 * Rattache ou détache la compétence de l'EC pour un semestre. Un
 * rattachement sans semestre disparaît ; `ecIds` suit les rattachements.
 *
 * @returns vrai si la compétence est désormais rattachée à l'EC ce semestre
 */
export function basculerLien(competence: Element, idEc: string, semestre: string): boolean {
  let lien = lienEc(competence, idEc);
  if (lien === null) {
    lien = { id: idEc, sems: [] };
    competence.ecs = [...liensDe(competence), lien];
  }
  const actuels = semestresDe(lien);
  lien.sems = actuels.includes(semestre)
    ? actuels.filter((candidat) => candidat !== semestre)
    : [...actuels, semestre].sort((a, b) => SEMESTRES.indexOf(a as (typeof SEMESTRES)[number]) - SEMESTRES.indexOf(b as (typeof SEMESTRES)[number]));
  competence.ecs = liensDe(competence).filter((candidat) => semestresDe(candidat).length > 0);
  competence.ecIds = liensDe(competence).map((candidat) => candidat.id);
  const apres = lienEc(competence, idEc);
  return apres !== null && semestresDe(apres).includes(semestre);
}

/** Semestre retenu pour la planification : celui demandé s'il est l'un des six, sinon tous (texte vide). */
export function semestreRetenu(demande: unknown): string {
  return typeof demande === "string" && (SEMESTRES as readonly string[]).includes(demande) ? demande : "";
}
