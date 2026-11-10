// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Écrit une valeur JSON sous une forme unique : clés d'objet triées, sans espace.
 *
 * Deux valeurs de même contenu donnent le même texte quel que soit l'ordre
 * dans lequel leurs clés ont été créées, ce qui permet de les comparer et
 * d'en calculer une empreinte. L'ordre des tableaux, lui, compte.
 */
export function ecrireJsonCanonique(valeur: unknown): string {
  if (Array.isArray(valeur)) {
    return `[${valeur.map(ecrireJsonCanonique).join(",")}]`;
  }
  if (typeof valeur === "object" && valeur !== null) {
    const champs = Object.entries(valeur)
      // Une clé à valeur `undefined` n'existe pas en JSON : elle ne doit pas changer l'empreinte.
      .filter(([, contenu]) => contenu !== undefined)
      .sort(([cleA], [cleB]) => (cleA < cleB ? -1 : cleA > cleB ? 1 : 0))
      .map(([cle, contenu]) => `${JSON.stringify(cle)}:${ecrireJsonCanonique(contenu)}`);
    return `{${champs.join(",")}}`;
  }
  return JSON.stringify(valeur ?? null);
}

/** Empreinte SHA-256 (en hexadécimal) du contenu d'une valeur JSON. */
export async function calculerEmpreinte(valeur: unknown): Promise<string> {
  const octets = new TextEncoder().encode(ecrireJsonCanonique(valeur));
  const condense = await crypto.subtle.digest("SHA-256", octets);
  return Array.from(new Uint8Array(condense), (octet) => octet.toString(16).padStart(2, "0")).join("");
}
