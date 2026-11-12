// SPDX-License-Identifier: AGPL-3.0-or-later

/** Issue d'une vérification de mise à jour demandée par l'enseignant, quand rien n'est à installer. */
export type IssueSansMiseAJour = "a-jour" | "impossible";

/** Message rendu à l'enseignant après une vérification qui ne propose rien à installer. */
export function decrireVerification(issue: IssueSansMiseAJour, versionInstallee: string): string {
  if (issue === "impossible") {
    return "La vérification n'a pas abouti. Vérifiez votre connexion à Internet, puis réessayez.";
  }
  return versionInstallee === "" ? "DNMAX est à jour." : `DNMAX est à jour (version ${versionInstallee}).`;
}

/** Nombre de caractères des notes de version affichés dans l'annonce. */
export const LONGUEUR_MAXIMALE_NOTES = 280;

/**
 * Prépare les notes de version pour l'annonce : une seule ligne, bornée.
 * Elles viennent du réseau et ne sont jamais interprétées comme du HTML.
 */
export function resumerNotes(notes: string): string {
  const uneLigne = notes.replace(/\s+/g, " ").trim();
  const caracteres = Array.from(uneLigne);
  return caracteres.length > LONGUEUR_MAXIMALE_NOTES
    ? `${caracteres.slice(0, LONGUEUR_MAXIMALE_NOTES).join("").trimEnd()}…`
    : uneLigne;
}
