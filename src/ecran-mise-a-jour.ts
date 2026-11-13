// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-mise-a-jour.css";
import { resumerNotes, type IssueSansMiseAJour } from "./domaine/annonce-mise-a-jour";
import { chercherMiseAJour, type MiseAJour } from "./enveloppe";

function creerBouton(texte: string, classe: string, action: () => void): HTMLButtonElement {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = classe;
  bouton.textContent = texte;
  bouton.addEventListener("click", action);
  return bouton;
}

function annoncer(miseAJour: MiseAJour, avantInstallation: () => Promise<void>): void {
  const annonce = document.createElement("div");
  annonce.className = "annonce-mise-a-jour";
  annonce.setAttribute("role", "status");

  const titre = document.createElement("b");
  titre.textContent = `DNMAX ${miseAJour.version} est disponible`;
  const notes = document.createElement("p");
  notes.textContent = resumerNotes(miseAJour.notes) || "Vos données sont conservées.";
  const erreur = document.createElement("p");
  erreur.className = "annonce-erreur";
  erreur.hidden = true;

  const installer = creerBouton("Installer et redémarrer", "btn primary", () => {
    installer.disabled = true;
    installer.textContent = "Installation…";
    // Tout ce qui est en attente est écrit avant que l'application ne se relance.
    avantInstallation()
      .then(() => miseAJour.installer())
      .catch(() => {
        erreur.textContent =
          "La mise à jour n'a pas pu être installée. Vérifiez votre connexion, puis réessayez ; « Rechercher une mise à jour », en bas de la fenêtre, la proposera de nouveau.";
        erreur.hidden = false;
        installer.disabled = false;
        installer.textContent = "Réessayer";
      });
  });
  const actions = document.createElement("div");
  actions.className = "annonce-actions";
  actions.append(
    creerBouton("Plus tard", "btn ghost", () => {
      annonce.remove();
    }),
    installer,
  );
  annonce.append(titre, notes, erreur, actions);
  document.body.append(annonce);
}

/**
 * Cherche une mise à jour, à la demande de l'enseignant, et la propose s'il y
 * en a une : rien n'est installé sans son accord.
 *
 * @param avantInstallation écrit sur le disque ce qui est encore en attente
 * @returns `null` si une mise à jour est proposée, sinon l'issue à lui dire
 */
export async function verifierMiseAJour(avantInstallation: () => Promise<void>): Promise<IssueSansMiseAJour | null> {
  const recherche = await chercherMiseAJour();
  if (recherche.issue !== "disponible") {
    return recherche.issue;
  }
  document.querySelector(".annonce-mise-a-jour")?.remove();
  annoncer(recherche.miseAJour, avantInstallation);
  return null;
}
