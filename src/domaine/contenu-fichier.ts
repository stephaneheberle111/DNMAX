// SPDX-License-Identifier: AGPL-3.0-or-later

/** Formes sous lesquelles l'interface historique fournit un fichier à enregistrer. */
export type ContenuFichier = string | Blob | ArrayBuffer | Uint8Array;

/** Convertit un contenu en octets ; un texte est encodé en UTF-8. */
export async function convertirEnOctets(contenu: ContenuFichier): Promise<Uint8Array> {
  if (typeof contenu === "string") {
    return new TextEncoder().encode(contenu);
  }
  if (contenu instanceof Uint8Array) {
    return contenu;
  }
  if (contenu instanceof ArrayBuffer) {
    return new Uint8Array(contenu);
  }
  return new Uint8Array(await contenu.arrayBuffer());
}
