// SPDX-License-Identifier: AGPL-3.0-or-later
import { invoke } from "@tauri-apps/api/core";

/** En-tête lu par la commande `enregistrer_fichier` de l'enveloppe. */
const ENTETE_NOM_FICHIER = "x-nom-fichier";

/**
 * Ouvre la boîte de dialogue « Enregistrer sous » du système et y écrit le fichier.
 *
 * @returns `true` si le fichier a été écrit, `false` si l'enseignant a annulé.
 * @throws si l'écriture échoue ou si l'application tourne hors de l'enveloppe.
 */
export async function enregistrerFichier(nomPropose: string, octets: Uint8Array): Promise<boolean> {
  // Les en-têtes n'acceptent que de l'ASCII : le nom est encodé, l'enveloppe le décode.
  return await invoke<boolean>("enregistrer_fichier", octets, {
    headers: { [ENTETE_NOM_FICHIER]: encodeURIComponent(nomPropose) },
  });
}
