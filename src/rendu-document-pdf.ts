// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Traduit un document imprimable en définition pdfmake (objets simples, sans
 * accès à la bibliothèque) : la mise en page se teste sans produire de PDF.
 * Les mesures reprennent celles de la feuille de style de l'aperçu
 * (`ecran-apercu-document.css`), pour que le PDF ressemble à ce qui a été vu.
 */
import { estAdresseSure, type Bloc, type Contenu, type DocumentImprimable } from "./domaine/document-imprimable";

/** Points PDF par millimètre. */
const POINTS_PAR_MM = 72 / 25.4;

function mm(millimetres: number): number {
  return Math.round(millimetres * POINTS_PAR_MM * 100) / 100;
}

/** Feuille A4, en points. */
const LARGEUR_PAGE = mm(210);
const MARGE_HORIZONTALE = mm(18);
const MARGE_VERTICALE = mm(15);
const LARGEUR_UTILE = LARGEUR_PAGE - 2 * MARGE_HORIZONTALE;

/** Hauteur des cases à remplir à la main, en points. */
const HAUTEUR_A_REMPLIR = { ligne: mm(9), signature: mm(20) } as const;

/** Nom sous lequel la police est déclarée à pdfmake (voir `generer-pdf.ts`). */
export const POLICE_PDF = "PublicSans";

const COULEUR_LIEN = "#1a4f9c";
const COULEUR_TRAITS = "#999999";

/** Élément de contenu pdfmake ; la bibliothèque n'est pas typée, seul ce qui est produit ici est décrit. */
export interface ElementPdf {
  readonly [cle: string]: unknown;
}

export interface DefinitionPdf {
  pageSize: "A4";
  pageMargins: [number, number, number, number];
  info: { title: string; creator: string; producer: string };
  language: string;
  defaultStyle: { font: string; fontSize: number; lineHeight: number; color: string };
  content: ElementPdf[];
}

function rendreContenu(contenu: Contenu): ElementPdf[] {
  return contenu.map((segment) => {
    if (segment.lien !== undefined) {
      return estAdresseSure(segment.lien)
        ? { text: segment.texte, link: segment.lien, color: COULEUR_LIEN, decoration: "underline" }
        : { text: segment.texte };
    }
    return segment.gras === true ? { text: segment.texte, bold: true } : { text: segment.texte };
  });
}

const DISPOSITION_TABLEAU = {
  hLineWidth: () => 0.75,
  vLineWidth: () => 0.75,
  hLineColor: () => COULEUR_TRAITS,
  vLineColor: () => COULEUR_TRAITS,
  paddingLeft: () => mm(2.5),
  paddingRight: () => mm(2.5),
  paddingTop: () => mm(1.6),
  paddingBottom: () => mm(1.6),
};

function rendreBloc(bloc: Bloc): ElementPdf {
  switch (bloc.type) {
    case "titre":
      return { text: bloc.texte, fontSize: 24, bold: true, lineHeight: 1, margin: [0, 0, 0, mm(1.5)] };
    case "sous-titre":
      return { text: bloc.texte, fontSize: 14, color: "#333333", margin: [0, 0, 0, mm(2)] };
    case "contexte":
      return { text: rendreContenu(bloc.contenu), fontSize: 10.5, color: "#333333", margin: [0, 0, 0, mm(4)] };
    case "paragraphe":
      return { text: rendreContenu(bloc.contenu), margin: [0, 0, 0, mm(2.5)] };
    case "intertitre":
      return { text: bloc.texte, fontSize: 13.5, bold: true, margin: [0, mm(3), 0, mm(2)] };
    case "liste":
      return { ul: bloc.elements.map((element) => ({ text: rendreContenu(element) })), margin: [0, 0, 0, mm(2.5)] };
    case "tableau": {
      const lignes = bloc.lignes;
      return {
        table: {
          widths: ["32%", "*"],
          dontBreakRows: true,
          heights: (indice: number): number | "auto" => {
            const aRemplir = lignes[indice]?.aRemplir;
            return aRemplir === undefined ? "auto" : HAUTEUR_A_REMPLIR[aRemplir];
          },
          body: lignes.map((ligne) => [{ text: ligne.intitule, bold: true }, { text: rendreContenu(ligne.contenu) }]),
        },
        layout: DISPOSITION_TABLEAU,
        fontSize: 10,
        margin: [0, 0, 0, mm(2.5)],
      };
    }
    case "decoupe":
      return {
        stack: [
          {
            canvas: [
              { type: "line", x1: 0, y1: 0, x2: LARGEUR_UTILE, y2: 0, lineWidth: 0.75, dash: { length: 3, space: 2 } },
            ],
          },
          { text: bloc.texte, fontSize: 9, alignment: "center", margin: [0, mm(1), 0, 0] },
        ],
        margin: [0, mm(3), 0, mm(1)],
      };
    case "insecable":
      return { stack: bloc.blocs.map(rendreBloc), unbreakable: true };
  }
}

/** Définition pdfmake d'un document : A4, une nouvelle page pour chacune de ses pages. */
export function definirDocumentPdf(document: DocumentImprimable): DefinitionPdf {
  return {
    pageSize: "A4",
    pageMargins: [MARGE_HORIZONTALE, MARGE_VERTICALE, MARGE_HORIZONTALE, MARGE_VERTICALE],
    info: { title: document.titre, creator: "DNMAX", producer: "DNMAX" },
    language: "fr-FR",
    defaultStyle: { font: POLICE_PDF, fontSize: 11, lineHeight: 1.2, color: "#000000" },
    content: document.pages.map((page, indice) => ({
      stack: page.map(rendreBloc),
      ...(indice > 0 ? { pageBreak: "before" } : {}),
    })),
  };
}
