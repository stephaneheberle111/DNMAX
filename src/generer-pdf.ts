// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Production du PDF d'un document imprimable, avec pdfmake (voir DECISIONS.md,
 * « Documents RGPD : aperçu, PDF et impression »). Ce module est chargé à la
 * demande : la bibliothèque et la police ne pèsent pas sur le démarrage.
 */
import pdfmake from "pdfmake/build/pdfmake";
import police400Italique from "@fontsource/public-sans/files/public-sans-latin-400-italic.woff?inline";
import police400 from "@fontsource/public-sans/files/public-sans-latin-400-normal.woff?inline";
import police700Italique from "@fontsource/public-sans/files/public-sans-latin-700-italic.woff?inline";
import police700 from "@fontsource/public-sans/files/public-sans-latin-700-normal.woff?inline";
import type { DocumentImprimable } from "./domaine/document-imprimable";
import { definirDocumentPdf, POLICE_PDF } from "./rendu-document-pdf";

/** Contenu base64 d'une adresse `data:` produite par l'import `?inline` de Vite. */
function base64De(adresseDonnees: string): string {
  return adresseDonnees.slice(adresseDonnees.indexOf(",") + 1);
}

let pret = false;

/** Déclare la police de l'application (Public Sans, la même que l'aperçu) et interdit tout accès réseau. */
function preparer(): void {
  if (pret) {
    return;
  }
  pdfmake.addVirtualFileSystem({
    "public-sans-400.woff": base64De(police400),
    "public-sans-700.woff": base64De(police700),
    "public-sans-400-italique.woff": base64De(police400Italique),
    "public-sans-700-italique.woff": base64De(police700Italique),
  });
  pdfmake.setFonts({
    [POLICE_PDF]: {
      normal: "public-sans-400.woff",
      bold: "public-sans-700.woff",
      italics: "public-sans-400-italique.woff",
      bolditalics: "public-sans-700-italique.woff",
    },
  });
  // Les documents n'ont ni image ni police distante : aucune adresse n'a à être téléchargée.
  pdfmake.setUrlAccessPolicy(() => false);
  pret = true;
}

/** Octets du PDF A4 du document. */
export async function genererPdf(document: DocumentImprimable): Promise<Uint8Array> {
  preparer();
  const octets = await pdfmake.createPdf(definirDocumentPdf(document)).getBuffer();
  // Copie dans un `Uint8Array` ordinaire : c'est ce que l'enveloppe attend comme corps de requête.
  return new Uint8Array(octets);
}
