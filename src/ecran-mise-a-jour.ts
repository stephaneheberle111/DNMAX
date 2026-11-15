// SPDX-License-Identifier: CECILL-2.1
import "./ecran-mise-a-jour.css";
import { resumerNotes, type IssueSansMiseAJour } from "./domaine/annonce-mise-a-jour";
import type { EtatMiseAJour } from "./domaine/pied-de-page";
import { lireRubriques } from "./domaine/nouveautes";
import { creerListeNouveautes } from "./ecran-nouveautes";
import { chercherMiseAJour, type MiseAJour } from "./enveloppe";

function creerBouton(texte: string, classe: string, action: () => void): HTMLButtonElement {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = classe;
  bouton.textContent = texte;
  bouton.addEventListener("click", action);
  return bouton;
}

/** Entrées montrées dans l'annonce ; le détail complet s'affiche après l'installation. */
const ENTREES_ANNONCE = 6;

function annoncer(miseAJour: MiseAJour, avantInstallation: () => Promise<void>): void {
  const annonce = document.createElement("div");
  annonce.className = "annonce-mise-a-jour";
  annonce.setAttribute("role", "status");

  const titre = document.createElement("b");
  titre.textContent = `DNMAX ${miseAJour.version} est disponible`;
  // Notes classées par type de changement quand elles suivent le journal ; sinon, une ligne.
  const groupes = lireRubriques(miseAJour.notes);
  const notes = groupes.length > 0 ? creerListeNouveautes(groupes, ENTREES_ANNONCE) : document.createElement("p");
  if (groupes.length === 0) {
    notes.textContent = resumerNotes(miseAJour.notes) || "Vos données sont conservées.";
  }
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
          "La mise à jour n'a pas pu être installée. Vérifiez votre connexion, puis réessayez ; un clic sur la version, en bas de la fenêtre, la proposera de nouveau.";
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

let etat: EtatMiseAJour = "inconnu";
const abonnes = new Set<(etat: EtatMiseAJour) => void>();

/** Suit l'état de la recherche de mise à jour (bas de page, Paramètres) ; appelé tout de suite avec l'état actuel. */
export function suivreMiseAJour(surChangement: (etat: EtatMiseAJour) => void): void {
  abonnes.add(surChangement);
  surChangement(etat);
}

function changerEtat(nouvel: EtatMiseAJour): void {
  etat = nouvel;
  abonnes.forEach((abonne) => {
    abonne(etat);
  });
}

/**
 * Lance une recherche de mise à jour, à la demande de l'enseignant (bas de page
 * ou Paramètres), et tient tous les affichages au courant de son issue.
 * Une recherche déjà en cours n'en relance pas une autre.
 */
export async function rechercherMiseAJour(avantInstallation: () => Promise<void>): Promise<EtatMiseAJour> {
  if (etat === "en-cours") {
    return etat;
  }
  changerEtat("en-cours");
  const issue = await verifierMiseAJour(avantInstallation);
  changerEtat(issue === null ? "disponible" : issue);
  return etat;
}
