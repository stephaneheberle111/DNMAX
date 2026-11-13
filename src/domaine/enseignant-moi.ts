// SPDX-License-Identifier: AGPL-3.0-or-later
import { estObjet } from "./echange/modele";
import type { Identite } from "./identite";

/**
 * Liste des enseignants de l'établissement et enseignant « c'est moi »,
 * tels que les tient l'interface historique (`DATA.enseignants`, `DATA.moi`).
 * Les éléments ne sont pas typés : ils viennent de données enregistrées.
 */
export interface EnseignantsEtMoi {
  enseignants: readonly unknown[];
  moi: unknown;
}

/** Enseignant tel que l'enregistre l'interface historique. */
export interface Enseignant {
  id: string;
  prenom: string;
  nomFam: string;
  /** Nom affiché « Prénom Nom ». */
  nom: string;
  discipline: string;
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

/** Forme de comparaison d'un nom : sans accents, en minuscules, espaces réduits. */
export function normaliserNomPersonne(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nom complet d'un enseignant enregistré : prénom et nom s'ils sont saisis, sinon le nom affiché. */
function nomComplet(enseignant: Record<string, unknown>): string {
  const compose = `${texte(enseignant.prenom)} ${texte(enseignant.nomFam)}`;
  return compose.trim() === "" ? texte(enseignant.nom) : compose;
}

function identifiantDe(enseignant: unknown): string | null {
  return estObjet(enseignant) && typeof enseignant.id === "string" && enseignant.id !== "" ? enseignant.id : null;
}

/**
 * Déclare l'enseignant de cette installation parmi les enseignants de
 * l'établissement et le marque « c'est moi ».
 *
 * - Identité sans prénom ni nom : rien.
 * - « C'est moi » déjà désigné, sur un enseignant présent : rien, le choix est respecté.
 * - Un enseignant porte déjà ce prénom et ce nom (sans tenir compte des
 *   accents, de la casse ni des espaces) : il devient « moi ».
 * - Sinon l'enseignant est ajouté, avec l'identifiant de l'identité.
 *
 * Idempotente : appliquée à son propre résultat, elle ne change plus rien.
 *
 * @returns les données à enregistrer, ou `null` s'il n'y a rien à changer
 */
export function provisionnerEnseignantMoi(donnees: EnseignantsEtMoi, identite: Identite): EnseignantsEtMoi | null {
  const recherche = normaliserNomPersonne(`${identite.prenom} ${identite.nomFamille}`);
  if (recherche === "") {
    return null;
  }
  const identifiants = donnees.enseignants.map(identifiantDe);
  if (typeof donnees.moi === "string" && donnees.moi !== "" && identifiants.includes(donnees.moi)) {
    return null;
  }
  const homonyme = donnees.enseignants.find(
    (enseignant) =>
      identifiantDe(enseignant) !== null && estObjet(enseignant) && normaliserNomPersonne(nomComplet(enseignant)) === recherche,
  );
  if (homonyme !== undefined) {
    return { enseignants: donnees.enseignants, moi: identifiantDe(homonyme) };
  }
  const nouveau: Enseignant = {
    id: identite.id,
    prenom: identite.prenom,
    nomFam: identite.nomFamille,
    nom: identite.nom,
    discipline: "",
  };
  return { enseignants: [...donnees.enseignants, nouveau], moi: identite.id };
}
