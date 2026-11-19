// SPDX-License-Identifier: CECILL-2.1
/**
 * L'éditeur commun de « Mon établissement », des Préférences et de
 * « Référentiel > Constituer » : un panneau titré, une ligne d'en-tête, des
 * lignes à saisir, et la suppression en deux temps (un premier clic arme le
 * bouton, qui devient « Confirmer » ; le second supprime). Le balisage reprend
 * celui de l'interface, attribut par attribut, pour que les styles
 * et les visites guidées le retrouvent tel quel.
 */
import { bulleAide } from "./volets";

/** Élément aux attributs posés dans l'ordre donné, sans attribut de classe vide. */
export function balise<Nom extends keyof HTMLElementTagNameMap>(
  nom: Nom,
  attributs: readonly (readonly [string, string])[] = [],
  texte = "",
): HTMLElementTagNameMap[Nom] {
  const element = document.createElement(nom);
  for (const [cle, valeur] of attributs) element.setAttribute(cle, valeur);
  if (texte !== "") element.textContent = texte;
  return element;
}

/** Ligne d'en-tête des colonnes : la grille CSS des lignes et l'intitulé de chaque colonne. */
export interface EnteteEditeur {
  readonly css: string;
  readonly cellules: readonly string[];
}

export interface PanneauEditeur {
  readonly titre: string;
  /** Compteur affiché à côté du titre (« 3 », « 2 mentions »). */
  readonly compte: string;
  /** Boutons d'action, en haut à droite. */
  readonly actions: readonly HTMLElement[];
  readonly entete: EnteteEditeur | null;
  /** Lignes du panneau ; sans ligne, « Rien pour l'instant. » */
  readonly lignes: readonly Node[];
  /** Aide en bulle à côté du titre ; texte fixe, écrit dans le code. */
  readonly aide: string;
}

/** Panneau de l'éditeur commun (`edPanel` de l'interface). */
export function panneauEditeur(options: PanneauEditeur): HTMLElement {
  const panneau = balise("div", [["class", "panel"]]);
  const tete = balise("div", [["class", "pick-head"]]);
  const titre = balise("h3", [], options.titre);
  if (options.aide !== "") titre.append(bulleAide(options.aide));
  const actions = balise("div", [["style", "margin-left:auto;display:flex;gap:7px;flex-wrap:wrap"]]);
  actions.append(...options.actions);
  tete.append(titre, balise("span", [["class", "count"]], options.compte), actions);
  panneau.append(tete);
  if (options.entete !== null) {
    const entete = balise("div", [
      ["class", "edhead"],
      ["style", options.entete.css],
    ]);
    for (const cellule of options.entete.cellules) entete.append(balise("span", [], cellule));
    panneau.append(entete);
  }
  const corps = balise("div");
  if (options.lignes.length > 0) corps.append(...options.lignes);
  else corps.append(balise("div", [["class", "empty"]], "Rien pour l'instant."));
  panneau.append(corps);
  return panneau;
}

/**
 * Suppression en deux temps, partagée par tous les volets : l'identifiant du
 * bouton armé, et de quoi armer un bouton ou confirmer la suppression.
 */
export interface Armement {
  /** Identifiant du bouton armé, ou `null`. */
  readonly arme: string | null;
  /**
   * Premier clic : arme le bouton et redessine ; second clic sur le même
   * bouton : désarme et exécute la suppression.
   */
  armer(id: string, supprimer: () => void): void;
}

/** Bouton « Supprimer » à deux temps (`delBtn` de l'interface). */
export function boutonSupprimer(id: string, libelle: string, armement: Armement, supprimer: () => void): HTMLButtonElement {
  const arme = armement.arme === id;
  const bouton = balise(
    "button",
    [
      ["class", `btn ghost ${arme ? "danger" : ""}`],
      ["data-eddel", id],
    ],
    arme ? "Confirmer" : libelle,
  );
  bouton.addEventListener("click", () => {
    armement.armer(id, supprimer);
  });
  return bouton;
}

/** Bouton d'action du panneau (« + Ajouter »…). */
export function boutonAction(texte: string, id: string, action: () => void): HTMLButtonElement {
  const bouton = balise(
    "button",
    [
      ["class", "btn ghost"],
      ["id", id],
    ],
    texte,
  );
  bouton.addEventListener("click", action);
  return bouton;
}

/** Champ texte d'une ligne ; `valeur` est posée en attribut, comme dans l'interface. */
export function champLigne(attributs: readonly (readonly [string, string])[], saisie: (valeur: string) => void): HTMLInputElement {
  const champ = balise("input", [["type", "text"], ...attributs]);
  champ.addEventListener("input", () => {
    saisie(champ.value);
  });
  return champ;
}

/** Ligne de l'éditeur, sur la grille de l'en-tête. */
export function ligneEditeur(css: string, cellules: readonly Node[]): HTMLElement {
  const ligne = balise("div", [
    ["class", "ed"],
    ["style", css],
  ]);
  ligne.append(...cellules);
  return ligne;
}
