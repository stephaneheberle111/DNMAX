// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-entetes.css";

/**
 * Tient à jour la variable CSS --hauteur-barre avec la hauteur réelle de la
 * barre du haut, sous laquelle se collent les en-têtes de tableau. Elle varie
 * avec la taille du texte (grands écrans) et le passage sur deux lignes.
 */
export function suivreHauteurBarre(): void {
  const barre = document.querySelector<HTMLElement>("header.bar");
  if (barre === null) {
    return;
  }
  const mettreAJour = (): void => {
    document.documentElement.style.setProperty("--hauteur-barre", `${String(barre.offsetHeight)}px`);
  };
  new ResizeObserver(mettreAJour).observe(barre);
  mettreAJour();
}
