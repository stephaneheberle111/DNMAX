// SPDX-License-Identifier: AGPL-3.0-or-later

/** Systèmes que le formulaire « Idées et bugs » du site sait présélectionner. */
export const SYSTEMES_RECONNUS = ["Windows", "macOS", "Linux"] as const;
export type Systeme = (typeof SYSTEMES_RECONNUS)[number];

/** Même motif strict que celui accepté par le site : une version publiée, sans suffixe. */
const MOTIF_VERSION = /^\d+\.\d+\.\d+$/;

/**
 * Déduit le système d'exploitation de la chaîne d'identification du navigateur
 * intégré. Rend `null` si rien de connu n'y figure : mieux vaut laisser
 * l'enseignant choisir que présélectionner un système faux.
 */
export function deduireSysteme(agentUtilisateur: string): Systeme | null {
  if (/Windows/i.test(agentUtilisateur)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(agentUtilisateur)) return "macOS";
  if (/Linux/i.test(agentUtilisateur)) return "Linux";
  return null;
}

/**
 * Ajoute à l'adresse de la page « Idées et bugs » la version installée et le
 * système, pour que le site préremplisse le signalement. Une version qui ne
 * suit pas le motif `X.Y.Z` ou un système absent ne sont pas transmis ;
 * l'ancre de l'adresse de départ est conservée.
 */
export function construireAdresseRetours(adresseRetours: string, version: string, systeme: Systeme | null): string {
  const adresse = new URL(adresseRetours);
  const versionNettoyee = version.trim();
  if (MOTIF_VERSION.test(versionNettoyee)) adresse.searchParams.set("version", versionNettoyee);
  if (systeme !== null) adresse.searchParams.set("systeme", systeme);
  return adresse.toString();
}
