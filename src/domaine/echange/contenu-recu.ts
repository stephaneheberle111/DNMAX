// SPDX-License-Identifier: CECILL-2.1

/**
 * Contrôles appliqués à tout contenu venu d'un autre poste, avant qu'il ne
 * soit lu champ par champ : un fichier d'échange est écrit par quelqu'un
 * d'autre, et peut avoir été trafiqué.
 */

/** Forme des identifiants que l'application produit : lettres, chiffres, `.`, `_`, `-`, 64 caractères au plus. */
const FORME_IDENTIFIANT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** Noms qui, pris comme clé d'un objet, atteignent le prototype au lieu d'une donnée. */
const CLES_RESERVEES: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

/** Forme des couleurs que l'application enregistre (`#rgb` à `#rrggbbaa`). */
const FORME_COULEUR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Forme rendue par `Date.prototype.toISOString`. */
const FORME_DATE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

/** Au-delà, le contenu n'a pas été produit par l'application. */
const PROFONDEUR_MAXIMALE = 64;

/**
 * Indique si un identifiant reçu peut être repris tel quel : il sert ensuite
 * de clé d'objet et d'attribut dans la page, où un guillemet, un chevron ou
 * `__proto__` feraient autre chose que désigner une donnée.
 */
export function estIdentifiantSur(valeur: string): boolean {
  return FORME_IDENTIFIANT.test(valeur) && !CLES_RESERVEES.has(valeur);
}

/** Indique si un texte est une date au format ISO, et une date qui existe. */
export function estDateIso(valeur: string): boolean {
  if (!FORME_DATE_ISO.test(valeur)) {
    return false;
  }
  const instant = new Date(valeur);
  // Une date impossible (mois 13) est soit refusée, soit reportée sur une autre : dans les deux cas, ce n'est pas elle.
  return !Number.isNaN(instant.getTime()) && instant.toISOString().slice(0, 19) === valeur.slice(0, 19);
}

function estCleIdentifiant(cle: string): boolean {
  return cle === "id" || cle.endsWith("Id");
}

/**
 * Parcourt un contenu reçu (déjà analysé comme JSON) et dit s'il peut être lu.
 *
 * Refusé (`false`) : une clé réservée du langage, un identifiant (`id`,
 * `…Id`, élément d'une liste `…Ids`) qui n'a pas la forme de ceux de
 * l'application, une imbrication démesurée. Un identifiant vide est laissé
 * aux lecteurs, qui savent où il est admis.
 *
 * Corrigé sur place : une `couleur` qui n'est pas hexadécimale est retirée,
 * l'affichage retombant alors sur sa couleur par défaut. Une couleur ne
 * mérite pas de refuser tout un fichier, mais elle est écrite dans un style.
 */
export function assainirContenuRecu(valeur: unknown, profondeur = 0): boolean {
  if (typeof valeur !== "object" || valeur === null) {
    return true;
  }
  if (profondeur > PROFONDEUR_MAXIMALE) {
    return false;
  }
  if (Array.isArray(valeur)) {
    return valeur.every((element) => assainirContenuRecu(element, profondeur + 1));
  }
  const objet = valeur as Record<string, unknown>;
  for (const cle of Object.keys(objet)) {
    if (CLES_RESERVEES.has(cle)) {
      return false;
    }
    const contenu = objet[cle];
    if (estCleIdentifiant(cle) && typeof contenu === "string" && contenu !== "" && !estIdentifiantSur(contenu)) {
      return false;
    }
    if (cle.endsWith("Ids") && Array.isArray(contenu) && contenu.some((element) => typeof element === "string" && !estIdentifiantSur(element))) {
      return false;
    }
    if (cle === "couleur" && !(typeof contenu === "string" && FORME_COULEUR.test(contenu))) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- la clé vaut « couleur », vérifiée à la ligne précédente
      delete objet[cle];
      continue;
    }
    if (!assainirContenuRecu(contenu, profondeur + 1)) {
      return false;
    }
  }
  return true;
}
