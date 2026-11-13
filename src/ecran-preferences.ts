// SPDX-License-Identifier: AGPL-3.0-or-later
import { THEME_PAR_DEFAUT, attributTheme, estTheme, lireTheme, type Theme } from "./domaine/theme";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";

/**
 * Le thème est rangé dans le stockage de la vue web, pas dans le coffre : il
 * doit s'appliquer dès l'écran du mot de passe, avant que le coffre soit ouvert.
 * Ce n'est qu'un réglage d'affichage, propre à cet ordinateur.
 */
const CLE_THEME = "dnmax.theme";

const IDENTIFIANT_CHOIX_THEME = "choix-theme";

export const MESSAGE_ECHELLE_OFFICIELLE =
  "L'échelle d'évaluation officielle pour les DN MADE est celle des niveaux de maîtrise.";

function lireThemeEnregistre(): Theme {
  try {
    return lireTheme(localStorage.getItem(CLE_THEME));
  } catch {
    // Stockage indisponible : on suit l'ordinateur.
    return THEME_PAR_DEFAUT;
  }
}

function enregistrerTheme(theme: Theme): void {
  try {
    localStorage.setItem(CLE_THEME, theme);
  } catch {
    // Stockage indisponible : le choix vaut pour cette session seulement.
  }
}

function appliquerTheme(theme: Theme): void {
  const attribut = attributTheme(theme);
  if (attribut === null) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", attribut);
  }
}

/** Applique le thème enregistré ; à appeler au plus tôt, avant tout affichage. */
export function appliquerThemeEnregistre(): void {
  appliquerTheme(lireThemeEnregistre());
}

/** Branche le choix Clair / Sombre / Comme le système du panneau « Apparence » de Préférences. */
export function installerChoixTheme(): void {
  const choix = document.getElementById(IDENTIFIANT_CHOIX_THEME);
  if (choix === null) {
    return;
  }
  const actuel = lireThemeEnregistre();
  for (const bouton of choix.querySelectorAll<HTMLInputElement>('input[name="theme"]')) {
    bouton.checked = bouton.value === actuel;
    bouton.addEventListener("change", () => {
      if (bouton.checked && estTheme(bouton.value)) {
        enregistrerTheme(bouton.value);
        appliquerTheme(bouton.value);
      }
    });
  }
}

/**
 * Rappelle l'échelle officielle avant tout changement d'échelle d'évaluation
 * dans Préférences. Fermer la boîte (croix, fond, Échap) vaut « Annuler ».
 *
 * @returns `true` si l'enseignant confirme le changement.
 */
export function confirmerChangementEchelle(): Promise<boolean> {
  return new Promise((resoudre) => {
    let confirme = false;
    const { boite, fermer } = ouvrirBoite("Échelle d'évaluation", () => {
      resoudre(confirme);
    });
    const actions = creer("div", "echange-actions");
    const confirmer = creerBouton("Confirmer", "btn primary", () => {
      confirme = true;
      fermer();
    });
    actions.append(creerBouton("Annuler", "btn ghost", fermer), confirmer);
    boite.classList.add("boite-etroite");
    boite.append(creer("p", "", MESSAGE_ECHELLE_OFFICIELLE), actions);
    confirmer.focus();
  });
}
