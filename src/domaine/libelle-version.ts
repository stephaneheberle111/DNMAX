// SPDX-License-Identifier: AGPL-3.0-or-later

const FORMAT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

/**
 * Compose le libellé affiché à l'enseignant, par exemple « DNMAX 1.4.0 ».
 *
 * La version vient de l'enveloppe de bureau, donc de l'extérieur : une valeur
 * absente ou mal formée donne le nom seul plutôt qu'un libellé trompeur.
 */
export function composerLibelleVersion(nomApplication: string, version: string | null): string {
  const versionNettoyee = version?.trim() ?? "";
  if (!FORMAT_VERSION.test(versionNettoyee)) {
    return nomApplication;
  }
  return `${nomApplication} ${versionNettoyee}`;
}
