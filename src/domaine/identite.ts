// SPDX-License-Identifier: AGPL-3.0-or-later
import { analyserJson, estObjet } from "./echange/modele";

/** Clé du magasin où est rangée l'identité de l'enseignant. */
export const CLE_IDENTITE = "dnmax.identite";

/** Longueur maximale conservée pour un nom d'enseignant. */
export const LONGUEUR_MAXIMALE_NOM = 80;

/** L'enseignant qui utilise cette installation. */
export interface Identite {
  /** Identifiant stable de l'installation : distingue deux enseignants homonymes. */
  id: string;
  /** Nom affiché aux autres enseignants à côté de ce qu'il a modifié. */
  nom: string;
}

/** Ramène un nom saisi à une forme propre : espaces superflus retirés, longueur bornée. */
export function nettoyerNom(saisie: string): string {
  return Array.from(saisie.replace(/\s+/g, " ").trim()).slice(0, LONGUEUR_MAXIMALE_NOM).join("").trim();
}

/** Crée l'identité d'un enseignant ; rend `null` si le nom saisi est vide. */
export function creerIdentite(saisie: string, identifiant: string): Identite | null {
  const nom = nettoyerNom(saisie);
  return nom === "" ? null : { id: identifiant, nom };
}

/** Lit l'identité enregistrée ; rend `null` si elle est absente ou inutilisable. */
export function lireIdentite(texte: string | null | undefined): Identite | null {
  const valeur = analyserJson(texte);
  if (!estObjet(valeur) || typeof valeur.id !== "string" || typeof valeur.nom !== "string") {
    return null;
  }
  const nom = nettoyerNom(valeur.nom);
  return valeur.id === "" || nom === "" ? null : { id: valeur.id, nom };
}
