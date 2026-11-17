// SPDX-License-Identifier: CECILL-2.1
/**
 * Boutons et champs fixes de la page, branchés une fois au chargement :
 * barre d'outils de la liste, navigation de l'éditeur, filtres de
 * l'explorateur du référentiel. Chaque action est fournie par l'interface,
 * qui tient l'état. Les écrans qui se redessinent branchent leurs propres
 * éléments.
 */

export interface ActionsInterface {
  chargerExemple(): void;
  nouvelleEvaluation(): void;
  revenirALaListe(): void;
  remettreModulesParDefaut(): void;
  /** Étape 2 : recherche dans les compétences proposées. */
  chercherCompetence(texte: string): void;
  /** Étape 2 : retire toutes les compétences choisies. */
  viderSelection(): void;
  allerALEtape(etape: string): void;
  /** Étape 3 : regroupe la sélection, ou l'annule. */
  regrouperSelection(): void;
  annulerSelection(): void;
  /** Bouton final de l'éditeur : ramène à la liste (en enregistrant un brouillon complet). */
  terminer(): void;
  /** Étape 4 : grille de la promotion ou fiche individuelle. */
  choisirModeSaisie(mode: string): void;
  chercherDansReferentiel(texte: string): void;
  regrouperReferentiel(groupe: string): void;
  filtrerAnneeReferentiel(annee: string): void;
  effacerFiltresReferentiel(): void;
}

type Champ = HTMLInputElement | HTMLSelectElement;

function surClic(document: Document, identifiant: string, action: () => void): void {
  document.getElementById(identifiant)?.addEventListener("click", action);
}

function surValeur(document: Document, identifiant: string, evenement: "input" | "change", action: (valeur: string) => void): void {
  const element = document.getElementById(identifiant);
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) return;
  const champ: Champ = element;
  champ.addEventListener(evenement, () => {
    action(champ.value);
  });
}

/**
 * Posé par propriété (`onclick`) sur une liste d'éléments, comme avant : un
 * second branchement remplace le premier au lieu de s'y ajouter.
 */
function surClicDeChacun(elements: Iterable<HTMLElement>, action: (element: HTMLElement) => void): void {
  for (const element of elements) {
    element.onclick = () => {
      action(element);
    };
  }
}

export function brancherInterface(document: Document, actions: ActionsInterface): void {
  surClic(document, "bDemo", () => {
    actions.chargerExemple();
  });
  surClic(document, "bBack", () => {
    actions.revenirALaListe();
  });
  surClic(document, "bNew", () => {
    actions.nouvelleEvaluation();
  });
  surClic(document, "bModReset", () => {
    actions.remettreModulesParDefaut();
  });
  surValeur(document, "f-search", "input", (texte) => {
    actions.chercherCompetence(texte);
  });
  surClic(document, "bClear", () => {
    actions.viderSelection();
  });
  surClicDeChacun(document.querySelectorAll<HTMLElement>("[data-go]"), (bouton) => {
    actions.allerALEtape(bouton.dataset.go ?? "");
  });
  surClicDeChacun(document.querySelectorAll<HTMLElement>(".steps [data-step]"), (bouton) => {
    actions.allerALEtape(bouton.dataset.step ?? "");
  });
  surClic(document, "bLink", () => {
    actions.regrouperSelection();
  });
  surClic(document, "bLinkNone", () => {
    actions.annulerSelection();
  });
  surClic(document, "bSave3", () => {
    actions.terminer();
  });
  surClicDeChacun(document.querySelectorAll<HTMLElement>("#eMode [data-emode]"), (bouton) => {
    actions.choisirModeSaisie(bouton.dataset.emode ?? "");
  });
  surValeur(document, "r-search", "input", (texte) => {
    actions.chercherDansReferentiel(texte);
  });
  surValeur(document, "r-group", "change", (groupe) => {
    actions.regrouperReferentiel(groupe);
  });
  surValeur(document, "r-annee", "change", (annee) => {
    actions.filtrerAnneeReferentiel(annee);
  });
  surClic(document, "rClear", () => {
    actions.effacerFiltresReferentiel();
  });
}
