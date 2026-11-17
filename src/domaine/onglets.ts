// SPDX-License-Identifier: CECILL-2.1
/**
 * Pages principales de l'application et titre de la fenêtre. « Mes
 * évaluations » porte deux vues : la liste (`saved`) et la composition d'une
 * évaluation (`new`). Les Préférences s'ouvrent depuis le menu « Mon compte »,
 * sans onglet propre.
 */

/** Pages que l'interface sait afficher. */
export const PAGES = ["saved", "new", "prog", "ref", "org", "set", "pref"] as const;
export type Page = (typeof PAGES)[number];

/** Onglets de la barre, hors « Mes évaluations » : identifiant du bouton et page. */
export const ONGLETS: readonly (readonly [string, Page])[] = [
  ["t-prog", "prog"],
  ["t-ref", "ref"],
  ["t-org", "org"],
  ["t-set", "set"],
];

const TITRES: Readonly<Record<Page, string>> = {
  saved: "Mes évaluations",
  new: "Mes évaluations",
  prog: "Progression",
  ref: "Référentiel",
  org: "Mon établissement",
  set: "Paramètres",
  pref: "Préférences",
};

/** La page demandée si elle existe, sinon la liste des évaluations. */
export function pageAffichee(page: unknown): Page {
  return PAGES.find((candidate) => candidate === page) ?? "saved";
}

/** Page ouverte par un bouton de la barre des onglets. */
export function pageDuBouton(identifiant: string): string {
  return identifiant === "t-saved" ? "saved" : identifiant.slice(2);
}

/** Titre de la fenêtre : le nom, puis la page affichée. */
export function titreFenetre(page: Page): string {
  return `DNMAX · ${TITRES[page]}`;
}
