// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-export.css";
import { ouvrirDernierExport } from "./enveloppe";

/** Durée d'affichage de la proposition d'ouverture avant qu'elle ne s'efface d'elle-même. */
const DUREE_AFFICHAGE_MS = 20_000;
const CLASSE_ANNONCE = "annonce-export";

/**
 * Après l'enregistrement d'un document exporté, propose de l'ouvrir.
 * Une proposition précédente encore affichée est remplacée.
 */
export function proposerOuvertureExport(nomFichier: string): void {
  document.querySelector(`.${CLASSE_ANNONCE}`)?.remove();
  const annonce = document.createElement("div");
  annonce.className = CLASSE_ANNONCE;
  annonce.setAttribute("role", "status");

  const texte = document.createElement("p");
  texte.textContent = `Document enregistré : ${nomFichier}`;
  const ouvrir = document.createElement("button");
  ouvrir.type = "button";
  ouvrir.className = "btn primary";
  ouvrir.textContent = "Ouvrir le document";
  const fermer = document.createElement("button");
  fermer.type = "button";
  fermer.className = "btn ghost";
  fermer.textContent = "Fermer";

  const minuterie = window.setTimeout(() => {
    annonce.remove();
  }, DUREE_AFFICHAGE_MS);
  fermer.addEventListener("click", () => {
    window.clearTimeout(minuterie);
    annonce.remove();
  });
  ouvrir.addEventListener("click", () => {
    window.clearTimeout(minuterie);
    ouvrirDernierExport()
      .then(() => {
        annonce.remove();
      })
      .catch(() => {
        texte.textContent = `Le document est bien enregistré (${nomFichier}), mais aucun logiciel n'a pu l'ouvrir. Ouvrez-le depuis son dossier.`;
        ouvrir.remove();
      });
  });
  const actions = document.createElement("div");
  actions.className = "annonce-actions";
  actions.append(fermer, ouvrir);
  annonce.append(texte, actions);
  document.body.append(annonce);
}
