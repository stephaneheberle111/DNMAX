// SPDX-License-Identifier: CECILL-2.1
/**
 * Étape 1 de l'éditeur, champs simples : intitulé, consignes, dates de
 * distribution et de rendu. Les autres blocs de l'étape (promotions,
 * semestre, enseignants, livrables, UE et EC) ont leur propre écran dans
 * `editeur/etape-evaluation`.
 */

export interface ContenuFormulaire {
  readonly titre: string;
  readonly consignes: string;
  /** Date de distribution prévue (AAAA-MM-JJ), ou vide. */
  readonly distribution: string;
  /** Date de rendu prévue (AAAA-MM-JJ), ou vide. */
  readonly rendu: string;
}

export interface ActionsFormulaire {
  changerTitre(titre: string): void;
  changerConsignes(consignes: string): void;
  changerDistribution(date: string): void;
  changerRendu(date: string): void;
}

function champ(document: Document, identifiant: string): HTMLInputElement | HTMLTextAreaElement | null {
  const element = document.getElementById(identifiant);
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element : null;
}

/** Remplit les champs ; le rendu ne peut précéder la distribution. */
export function remplirFormulaire(document: Document, contenu: ContenuFormulaire): void {
  const titre = champ(document, "f-titre");
  if (titre) titre.value = contenu.titre;
  const distribution = champ(document, "f-distrib");
  if (distribution) distribution.value = contenu.distribution;
  const rendu = champ(document, "f-rendu");
  if (rendu instanceof HTMLInputElement) {
    rendu.value = contenu.rendu;
    rendu.min = contenu.distribution;
  }
  const consignes = champ(document, "f-consignes");
  if (consignes) consignes.value = contenu.consignes;
  // Une seule colonne : les étudiants se choisissent par les promotions, à l'étape 4.
  const colonnes = document.getElementById("step1cols");
  if (colonnes) colonnes.style.gridTemplateColumns = "minmax(0,1fr)";
}

/** Branche les champs, une fois, au chargement. */
export function brancherFormulaire(document: Document, actions: ActionsFormulaire): void {
  const brancher = (identifiant: string, action: (valeur: string) => void): void => {
    const element = champ(document, identifiant);
    element?.addEventListener("input", () => {
      action(element.value);
    });
  };
  brancher("f-titre", (valeur) => {
    actions.changerTitre(valeur);
  });
  brancher("f-consignes", (valeur) => {
    actions.changerConsignes(valeur);
  });
  brancher("f-distrib", (valeur) => {
    actions.changerDistribution(valeur);
  });
  brancher("f-rendu", (valeur) => {
    actions.changerRendu(valeur);
  });
}
