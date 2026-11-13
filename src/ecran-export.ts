// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-export.css";
import { ouvrirDernierExport } from "./enveloppe";

/** Durée d'affichage de la proposition d'ouverture avant qu'elle ne s'efface d'elle-même. */
const DUREE_AFFICHAGE_MS = 20_000;
const CLASSE_ANNONCE = "annonce-export";
/** Hors de DNMAX, les données d'étudiants ne sont plus chiffrées : l'enseignant doit le savoir. */
const AVERTISSEMENT_ELEVES =
  "Ce document contient des noms et des résultats d'étudiants et n'est pas protégé par mot de passe : " +
  "rangez-le, partagez-le et supprimez-le avec le même soin qu'un relevé de notes.";

/**
 * Après l'enregistrement d'un document exporté, propose de l'ouvrir et,
 * s'il contient des données d'étudiants, rappelle qu'il n'est pas protégé.
 * Une proposition précédente encore affichée est remplacée.
 */
export function proposerOuvertureExport(nomFichier: string, contientEleves: boolean): void {
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

  const avertissement = document.createElement("p");
  avertissement.className = "annonce-export-avertissement";
  avertissement.textContent = AVERTISSEMENT_ELEVES;
  avertissement.hidden = !contientEleves;

  // Un rappel sur les données d'étudiants reste affiché jusqu'à ce qu'il soit fermé.
  const minuterie = contientEleves
    ? undefined
    : window.setTimeout(() => {
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
  annonce.append(texte, avertissement, actions);
  document.body.append(annonce);
}
