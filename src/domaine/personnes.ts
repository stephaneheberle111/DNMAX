// SPDX-License-Identifier: CECILL-2.1
/**
 * Prénom et nom des enseignants et des étudiants de « Mon établissement ».
 * Ils se saisissent à part (`prenom`, `nomFam`) ; `nom` reste le nom affiché
 * « Prénom Nom », utilisé partout ailleurs (listes, exports, échanges,
 * rapprochements). Règles reprises telles quelles de l'interface historique.
 */

/** Une personne telle que l'interface historique la range. */
export interface Personne {
  id: string;
  prenom: string;
  nomFam: string;
  nom: string;
}

/**
 * Comme `String(valeur || "")` dans l'interface historique pour du texte, un
 * nombre ou un booléen : toute valeur fausse devient une chaîne vide. Un objet,
 * qui n'est jamais un nom, devient aussi une chaîne vide.
 */
function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  if (typeof valeur === "number" || typeof valeur === "boolean" || typeof valeur === "bigint") {
    return valeur === false || valeur === 0 || valeur === 0n || Number.isNaN(valeur) ? "" : String(valeur);
  }
  return "";
}

/**
 * Sépare une ligne saisie en prénom et nom : deux colonnes collées d'un
 * tableur (prénom, tabulation, nom), sinon le premier mot pour le prénom.
 * Un mot seul est pris pour le nom.
 */
export function separerPrenomNom(saisie: unknown): { prenom: string; nomFam: string } {
  const ligne = texte(saisie).trim();
  const tabulation = ligne.indexOf("\t");
  if (tabulation >= 0) {
    return {
      prenom: ligne.slice(0, tabulation).replace(/\s+/g, " ").trim(),
      nomFam: ligne.slice(tabulation + 1).replace(/\s+/g, " ").trim(),
    };
  }
  const propre = ligne.replace(/\s+/g, " ");
  const espace = propre.indexOf(" ");
  return espace < 0 ? { prenom: "", nomFam: propre } : { prenom: propre.slice(0, espace), nomFam: propre.slice(espace + 1) };
}

/** Nom affiché « Prénom Nom », sans espaces superflues ; la partie vide est omise. */
export function composerNom(prenom: unknown, nomFam: unknown): string {
  return [prenom, nomFam]
    .map((partie) => texte(partie).replace(/\s+/g, " ").trim())
    .filter((partie) => partie !== "")
    .join(" ");
}

/** Personne créée à partir d'une ligne saisie. */
export function nouvellePersonne(id: string, ligne: string): Personne {
  const { prenom, nomFam } = separerPrenomNom(ligne);
  return { id, prenom, nomFam, nom: composerNom(prenom, nomFam) };
}

/**
 * Complète, sur place, une personne enregistrée avant que prénom et nom se
 * saisissent à part : ils sont tirés de son nom affiché.
 *
 * @returns la même personne
 */
export function completerPersonne<T extends Record<string, unknown>>(personne: T): T & { prenom: string; nomFam: string } {
  if (typeof personne.prenom !== "string" || typeof personne.nomFam !== "string") {
    Object.assign(personne, separerPrenomNom(personne.nom));
  }
  return personne as T & { prenom: string; nomFam: string };
}

/** Une ligne non vide par nom, sans espaces autour. */
export function lignesNoms(saisie: unknown): string[] {
  return texte(saisie)
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== "");
}
