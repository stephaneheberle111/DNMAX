// SPDX-License-Identifier: CECILL-2.1
/**
 * Barre des onglets : quel onglet est choisi, quelle vue est visible, et le
 * titre de la fenêtre. Les règles sont dans `domaine/onglets`.
 */
import { ONGLETS, pageAffichee, pageDuBouton, titreFenetre, type Page } from "../domaine/onglets";

function element(document: Document, identifiant: string): HTMLElement | null {
  return document.getElementById(identifiant);
}

/**
 * Montre la page demandée (la liste si elle est inconnue) et rend la page
 * effectivement affichée.
 */
export function afficherPage(document: Document, demandee: unknown): Page {
  const page = pageAffichee(demandee);
  element(document, "t-saved")?.setAttribute("aria-selected", String(page === "new" || page === "saved"));
  const nouvelle = element(document, "v-new");
  if (nouvelle) nouvelle.hidden = page !== "new";
  const liste = element(document, "v-saved");
  if (liste) liste.hidden = page !== "saved";
  for (const [identifiant, cible] of ONGLETS) {
    const bouton = element(document, identifiant);
    if (bouton) {
      bouton.hidden = false;
      bouton.setAttribute("aria-selected", String(page === cible));
    }
    const vue = element(document, `v${identifiant.slice(1)}`);
    if (vue) vue.hidden = page !== cible;
  }
  const preferences = element(document, "v-pref");
  if (preferences) preferences.hidden = page !== "pref";
  element(document, "bouton-compte")?.classList.toggle("actif", page === "pref");
  document.title = titreFenetre(page);
  return page;
}

/** Branche les boutons de la barre des onglets : `ouvrir` reçoit la page du bouton cliqué. */
export function brancherOnglets(document: Document, ouvrir: (page: string) => void): void {
  for (const identifiant of ["t-saved", ...ONGLETS.map(([bouton]) => bouton)]) {
    element(document, identifiant)?.addEventListener("click", () => {
      ouvrir(pageDuBouton(identifiant));
    });
  }
}
