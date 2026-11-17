// SPDX-License-Identifier: CECILL-2.1
import "./ecran-export.css";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";
import { ouvrirDernierExport } from "./enveloppe";

/** Durée d'affichage de la proposition d'ouverture avant qu'elle ne s'efface d'elle-même. */
const DUREE_AFFICHAGE_MS = 20_000;
const CLASSE_ANNONCE = "annonce-export";
/** Hors de DNMAX, les données d'étudiants ne sont plus chiffrées : l'enseignant doit le savoir. */
const AVERTISSEMENT_ELEVES =
  "Ce document contient des noms et des résultats d'étudiants et n'est pas protégé par mot de passe : " +
  "rangez-le, partagez-le et supprimez-le avec le même soin qu'un relevé de notes.";

/**
 * Avant d'enregistrer un document qui contient des étudiants : dit qu'il ne
 * sera pas protégé, et le fait confirmer. Fermer la boîte vaut « Annuler ».
 */
export function confirmerExportEleves(): Promise<boolean> {
  return new Promise((resoudre) => {
    let confirme = false;
    const { boite, fermer } = ouvrirBoite("Document avec des étudiants", () => {
      resoudre(confirme);
    });
    boite.classList.add("boite-etroite");
    const actions = creer("div", "echange-actions");
    const continuer = creerBouton("Enregistrer le document", "btn primary", () => {
      confirme = true;
      fermer();
    });
    actions.append(creerBouton("Annuler", "btn ghost", fermer), continuer);
    boite.append(creer("p", "", AVERTISSEMENT_ELEVES), actions);
    continuer.focus();
  });
}

/**
 * Après l'enregistrement d'un document exporté, propose de l'ouvrir. Une
 * proposition précédente encore affichée est remplacée. L'avertissement sur
 * les données d'étudiants a déjà été donné avant l'enregistrement.
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
