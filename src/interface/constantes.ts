// SPDX-License-Identifier: CECILL-2.1
/**
 * Constantes et petites aides de texte que l'ancien script déclarait en tête
 * (décision 38) et que les adaptateurs passent aux écrans TypeScript :
 * livrables d'origine, modes de regroupement de la recherche, `tidy` et
 * `norm`. Les semestres et l'échelle de niveaux sont dans `domaine/`.
 */

/** Livrables proposés à une installation neuve (Préférences > Livrables, « Rétablir la liste d'origine »). */
export const LIVRABLES_ORIGINE: readonly string[] = [
  "Carnet de projet",
  "Catalogue d'expérimentation",
  "Planches de projet",
  "Maquettes de recherches",
  "Frise chronologique",
  "Fiche de lecture",
  "Devoir réflexif",
  "Carnet d'exposition",
  "Diaporama",
  "Oral de présentation de projet",
];

/** Modes de regroupement de la vue « Recherche » d'Explorer, avec leur libellé. */
export const MODES_REGROUPEMENT: Readonly<Record<string, string>> = {
  bloc: "Par bloc de compétences",
  ue: "Par unité d'enseignement",
  ec: "Par enseignement constitutif",
  annee: "Par année",
  semestre: "Par semestre",
  liste: "Liste à plat",
};

/**
 * Recolle les lettres capitales séparées par un trait d'union (« U-E » → « UE »)
 * et retire les espaces de bord. `null` et `undefined` donnent un texte vide ;
 * toute autre valeur est convertie par `String`, comme le faisait l'historique.
 */
export function tidy(valeur: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
  return String(valeur ?? "")
    .replace(/([A-ZÀ-Ý])-([A-ZÀ-Ý])/g, "$1$2")
    .trim();
}

/**
 * Forme de comparaison d'un texte : minuscules, sans accents. Diffère de
 * `sansAccents` (domaine/constituer) pour un objet, converti ici par `String`.
 */
export function norm(valeur: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
  return String(valeur ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
