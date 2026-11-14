// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-fond.css";
import { FOND_PAR_DEFAUT, attributsFond, estForce, estTrame, lireFond, type Fond } from "./domaine/fond";

/**
 * Comme le thème, le fond est rangé dans le stockage de la vue web, propre au
 * compte de l'utilisateur sur cet ordinateur, et non dans le coffre : il habille
 * déjà l'écran du mot de passe. Ce n'est qu'un réglage d'affichage.
 */
const CLE_FOND = "dnmax.fond";

function lireFondEnregistre(): Fond {
  try {
    return lireFond(localStorage.getItem(CLE_FOND));
  } catch {
    return FOND_PAR_DEFAUT;
  }
}

function enregistrerFond(fond: Fond): void {
  try {
    localStorage.setItem(CLE_FOND, JSON.stringify(fond));
  } catch {
    // Stockage indisponible : le choix vaut pour cette session seulement.
  }
}

function appliquerFond(fond: Fond): void {
  for (const [nom, valeur] of Object.entries(attributsFond(fond))) {
    document.documentElement.setAttribute(nom, valeur);
  }
}

/** Applique le fond enregistré ; à appeler au plus tôt, avant tout affichage. */
export function appliquerFondEnregistre(): void {
  appliquerFond(lireFondEnregistre());
}

/** Branche le bloc « Fond de page » du panneau « Apparence » de Préférences. */
export function installerChoixFond(): void {
  const bloc = document.getElementById("choix-fond");
  if (bloc === null) {
    return;
  }
  let fond = lireFondEnregistre();
  const trames = [...bloc.querySelectorAll<HTMLInputElement>('input[name="fond"]')];
  const forces = [...bloc.querySelectorAll<HTMLButtonElement>("button[data-force]")];
  const caseX = bloc.querySelector<HTMLInputElement>("#fond-x-creux");

  const afficher = (): void => {
    for (const bouton of trames) bouton.checked = bouton.value === fond.trame;
    for (const bouton of forces) bouton.setAttribute("aria-pressed", String(bouton.dataset.force === fond.force));
    if (caseX !== null) caseX.checked = fond.xEnCreux;
  };
  const changer = (modification: Partial<Fond>): void => {
    fond = { ...fond, ...modification };
    enregistrerFond(fond);
    appliquerFond(fond);
    afficher();
  };

  for (const bouton of trames) {
    bouton.addEventListener("change", () => {
      if (bouton.checked && estTrame(bouton.value)) changer({ trame: bouton.value });
    });
  }
  for (const bouton of forces) {
    bouton.addEventListener("click", () => {
      const force = bouton.dataset.force;
      if (estForce(force)) changer({ force });
    });
  }
  caseX?.addEventListener("change", () => {
    changer({ xEnCreux: caseX.checked });
  });
  afficher();
}
