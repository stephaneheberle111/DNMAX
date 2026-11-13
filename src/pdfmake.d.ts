// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * pdfmake 0.3 n'est pas livré avec ses types : seule la part utilisée par
 * `generer-pdf.ts` est décrite ici.
 */
declare module "pdfmake/build/pdfmake" {
  interface DocumentPdfmake {
    /** Octets du PDF (un `Buffer` de la bibliothèque, qui est un `Uint8Array`). */
    getBuffer(): Promise<Uint8Array>;
  }

  interface PolicePdfmake {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  }

  interface Pdfmake {
    /** Fichiers de police, encodés en base64, par nom de fichier. */
    addVirtualFileSystem(fichiers: Record<string, string>): void;
    setFonts(polices: Record<string, PolicePdfmake>): void;
    setUrlAccessPolicy(politique: (adresse: string) => boolean): void;
    createPdf(definition: object): DocumentPdfmake;
  }

  const pdfmake: Pdfmake;
  export default pdfmake;
}
