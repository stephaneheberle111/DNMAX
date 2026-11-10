// SPDX-License-Identifier: AGPL-3.0-or-later
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";

/**
 * Lit la version auprès de l'enveloppe de bureau.
 *
 * Rend `null` hors de l'enveloppe (page ouverte dans un navigateur pendant le
 * développement) ou si l'appel échoue : l'affichage ne doit pas en dépendre.
 */
export async function lireVersionApplication(): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }
  try {
    return await getVersion();
  } catch {
    return null;
  }
}
