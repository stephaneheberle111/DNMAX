// SPDX-License-Identifier: CECILL-2.1
/**
 * Mes évaluations : la colonne de suivi. Une frise de cinq étapes (franchies
 * pleines, étape en cours à moitié pleine si elle n'est que commencée), et
 * dessous la prochaine chose à faire. Le statut lui-même est calculé par
 * `domaine/suivi-evaluation`. Règles reprises telles quelles de l'ancienne interface
 * historique.
 */
import { ETAPES_FRISE, POSITIONS_FRISE } from "./suivi-evaluation";

/** « 07/11 » ; vide pour une date absente. */
export function dateCourte(date: unknown): string {
  return typeof date === "string" && date !== "" ? date.split("-").reverse().slice(0, 2).join("/") : "";
}

/** La plus récente des dates connues (AAAA-MM-JJ), ou chaîne vide. */
export function derniereDate(dates: readonly unknown[]): string {
  return (
    dates
      .filter((date): date is string => typeof date === "string" && date !== "")
      .sort()
      .at(-1) ?? ""
  );
}

function position(statut: string): readonly [number, 0 | 1] {
  return (POSITIONS_FRISE as Readonly<Record<string, readonly [number, 0 | 1]>>)[statut] ?? [0, 0];
}

/** Les cinq points de la frise : leur classe (franchie, commencée, en cours) et le trait qui les relie. */
export function pointsFrise(statut: string): { classe: string; allumee: boolean }[] {
  const [rang, commencee] = position(statut);
  return ETAPES_FRISE.map((_etape, k) => ({
    classe: rang < 0 ? "" : k < rang ? "done" : k === rang ? (commencee ? "half cur" : "done cur") : "",
    allumee: rang >= k && k > 0,
  }));
}

/** État d'une étape, affiché dans sa petite fenêtre. */
export function etatEtape(etape: number, statut: string): string {
  const [rang, commencee] = position(statut);
  if (etape < rang || (etape === rang && !commencee)) return "étape franchie";
  return etape === rang ? "étape commencée" : "à venir";
}

/** Ce que la prochaine étape demande de savoir de l'évaluation. */
export interface SituationFrise {
  readonly moduleEleves: boolean;
  /** Date d'annulation, ou chaîne vide. */
  readonly annulee: string;
  /** Distribution prévue ou faite. */
  readonly distribution: string;
  /** Rendu prévu, butoir ou fait. */
  readonly rendu: string;
  /** Étudiants saisis entièrement, et en tout. */
  readonly saisie: { readonly full: number; readonly tot: number };
  /** Étudiants à qui l'évaluation est restituée, et en tout. */
  readonly restitutions: { readonly n: number; readonly tot: number };
  readonly derniereRestitution: string;
}

function pluriel(nombre: number, mot: string): string {
  return `${String(nombre)} ${mot}${nombre > 1 ? "s" : ""}`;
}

/** La prochaine chose à faire, sous la frise. */
export function prochaineEtape(statut: string, situation: SituationFrise): string {
  switch (statut) {
    case "annulee":
      return `annulée le ${dateCourte(situation.annulee)}`;
    case "prep":
      return situation.distribution === "" ? "→ à distribuer (date non fixée)" : `→ distribution prévue le ${dateCourte(situation.distribution)}`;
    case "distrib":
      return situation.rendu === "" ? "→ rendu attendu (date non fixée)" : `→ rendu attendu le ${dateCourte(situation.rendu)}`;
    case "rendu":
      return situation.moduleEleves ? "→ saisir les évaluations" : "→ exporter la grille et évaluer";
    case "evalcours": {
      if (!situation.moduleEleves) return "→ marquer terminée une fois évaluée";
      const { full, tot } = situation.saisie;
      return `→ ${pluriel(tot - full, "étudiant·e")} à saisir (${String(full)}/${String(tot)})`;
    }
    case "eval":
      return "→ à restituer aux étudiant·es";
    case "restpart": {
      const { n, tot } = situation.restitutions;
      return tot > 0 && n > 0 ? `→ à restituer à ${pluriel(tot - n, "étudiant·e")}` : "→ promotion restante à restituer";
    }
    default:
      return `✓ terminée${situation.derniereRestitution === "" ? "" : ` le ${dateCourte(situation.derniereRestitution)}`}`;
  }
}

/** Infobulle de la frise : les dates connues de l'évaluation. */
export function infobulleSuivi(dates: { saisie: string; distribution: string; rendu: string; evaluee: string; restituee: string }): string {
  return [
    `Saisie le ${dateCourte(dates.saisie)}`,
    dates.distribution === "" ? "distribution non datée" : `distribution prévue le ${dateCourte(dates.distribution)}`,
    dates.rendu === "" ? "rendu non daté" : `rendu prévu le ${dateCourte(dates.rendu)}`,
    dates.evaluee === "" ? "" : `terminée le ${dateCourte(dates.evaluee)}`,
    dates.restituee === "" ? "" : `restituée le ${dateCourte(dates.restituee)}`,
  ]
    .filter((morceau) => morceau !== "")
    .join(" · ");
}
