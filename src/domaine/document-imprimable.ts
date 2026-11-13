// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Description neutre d'un document à imprimer : des pages A4, faites de blocs.
 * Le même document est rendu en HTML (aperçu et impression) et en PDF : les
 * deux rendus suivent les mêmes pages, et aucun texte n'y est mis en forme à
 * la main.
 */

/** Morceau de texte : gras pour ce qui vient de la saisie, ou adresse web à rendre cliquable dans le PDF. */
export interface Segment {
  texte: string;
  gras?: true;
  /** Adresse `https://` ; le texte affiché est alors l'adresse elle-même. */
  lien?: string;
}

export type Contenu = readonly Segment[];

/** Ligne d'un tableau : un intitulé à gauche, un contenu ou une case à remplir à la main à droite. */
export interface LigneTableau {
  intitule: string;
  contenu: Contenu;
  /** Case vide à remplir à la main : d'une ligne d'écriture, ou assez haute pour une signature. */
  aRemplir?: "ligne" | "signature";
}

export type Bloc =
  | { type: "titre"; texte: string }
  | { type: "sous-titre"; texte: string }
  | { type: "contexte"; contenu: Contenu }
  | { type: "paragraphe"; contenu: Contenu }
  | { type: "intertitre"; texte: string }
  | { type: "liste"; elements: readonly Contenu[] }
  | { type: "tableau"; lignes: readonly LigneTableau[] }
  /** Trait pointillé avec sa consigne : la partie qui suit se découpe et se rend. */
  | { type: "decoupe"; texte: string }
  /** Blocs à garder sur une même page. */
  | { type: "insecable"; blocs: readonly Bloc[] };

export interface DocumentImprimable {
  /** Titre du document, repris dans les propriétés du PDF. */
  titre: string;
  /** Nom proposé à l'enregistrement du PDF. */
  nomFichier: string;
  /** Chaque page commence sur une nouvelle feuille A4. */
  pages: readonly (readonly Bloc[])[];
}

export function texte(valeur: string): Segment {
  return { texte: valeur };
}

export function gras(valeur: string): Segment {
  return { texte: valeur, gras: true };
}

export function lien(adresse: string): Segment {
  return { texte: adresse, lien: adresse };
}

/** Vrai pour une adresse web sûre à rendre cliquable : `https://` seulement. */
export function estAdresseSure(adresse: string): boolean {
  return /^https:\/\/[^\s"'<>]+$/.test(adresse);
}
