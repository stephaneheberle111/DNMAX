// SPDX-License-Identifier: AGPL-3.0-or-later

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
