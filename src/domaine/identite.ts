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
  /** Nom affiché aux autres enseignants à côté de ce qu'il a modifié : « Prénom Nom ». */
  nom: string;
  /** Prénom, saisi à part. */
  prenom: string;
  /** Nom de famille, saisi à part. */
  nomFamille: string;
}

/** Ramène un nom saisi à une forme propre : espaces superflus retirés, longueur bornée. */
export function nettoyerNom(saisie: string): string {
  return Array.from(saisie.replace(/\s+/g, " ").trim()).slice(0, LONGUEUR_MAXIMALE_NOM).join("").trim();
}

/**
 * Crée l'identité d'un enseignant à partir de son prénom et de son nom,
 * saisis séparément ; le nom affiché est « Prénom Nom ».
 *
 * @returns `null` si le prénom ou le nom est vide.
 */
export function creerIdentite(prenomSaisi: string, nomSaisi: string, identifiant: string): Identite | null {
  const prenom = nettoyerNom(prenomSaisi);
  const nomFamille = nettoyerNom(nomSaisi);
  if (prenom === "" || nomFamille === "") {
    return null;
  }
  return { id: identifiant, nom: nettoyerNom(`${prenom} ${nomFamille}`), prenom, nomFamille };
}

/**
 * Sépare un nom enregistré en un seul champ, avant que prénom et nom soient
 * saisis à part : le premier mot est pris pour le prénom, le reste pour le nom.
 * L'enseignant peut corriger sur sa ligne « C'est moi » de « Mon établissement »
 * (prénoms composés…).
 */
export function separerNom(nom: string): { prenom: string; nomFamille: string } {
  const propre = nettoyerNom(nom);
  const espace = propre.indexOf(" ");
  return espace < 0 ? { prenom: "", nomFamille: propre } : { prenom: propre.slice(0, espace), nomFamille: propre.slice(espace + 1) };
}

/**
 * Identité de l'enseignant après correction de son prénom et de son nom,
 * saisis sur sa ligne « C'est moi » de « Mon établissement ». L'identifiant de
 * l'installation ne change pas. Les valeurs ne sont pas typées : elles
 * viennent de l'interface historique.
 *
 * @returns la nouvelle identité, ou `null` si le prénom ou le nom est vide ou
 *   n'est pas du texte, ou si rien ne change.
 */
export function identiteRenommee(identite: Identite, prenomSaisi: unknown, nomSaisi: unknown): Identite | null {
  if (typeof prenomSaisi !== "string" || typeof nomSaisi !== "string") {
    return null;
  }
  const renommee = creerIdentite(prenomSaisi, nomSaisi, identite.id);
  if (renommee === null || (renommee.prenom === identite.prenom && renommee.nomFamille === identite.nomFamille)) {
    return null;
  }
  return renommee;
}

/** Lit l'identité enregistrée ; rend `null` si elle est absente ou inutilisable. */
export function lireIdentite(texte: string | null | undefined): Identite | null {
  const valeur = analyserJson(texte);
  if (!estObjet(valeur) || typeof valeur.id !== "string" || typeof valeur.nom !== "string") {
    return null;
  }
  const nom = nettoyerNom(valeur.nom);
  if (valeur.id === "" || nom === "") {
    return null;
  }
  const parties =
    typeof valeur.prenom === "string" && typeof valeur.nomFamille === "string"
      ? { prenom: nettoyerNom(valeur.prenom), nomFamille: nettoyerNom(valeur.nomFamille) }
      : separerNom(nom);
  return { id: valeur.id, nom, ...parties };
}
