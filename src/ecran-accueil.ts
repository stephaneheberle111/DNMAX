// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-accueil.css";
import { REFERENTIEL_PROPOSE } from "./configuration";
import { CLE_EVALUATIONS, lireEvaluations } from "./domaine/echange/modele";
import { estReferentielVide } from "./domaine/echange/referentiel";
import { ouvrirReception, type AccesDonnees } from "./ecran-echange";
import { ouvrirDansNavigateur } from "./enveloppe";

function creerBouton(texte: string, classe: string, action: () => void): HTMLButtonElement {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = classe;
  bouton.textContent = texte;
  bouton.addEventListener("click", action);
  return bouton;
}

function creerEtape(numero: string, texte: string, bouton: HTMLButtonElement): HTMLElement {
  const etape = document.createElement("li");
  const libelle = document.createElement("span");
  libelle.textContent = `${numero}. ${texte}`;
  etape.append(libelle, bouton);
  return etape;
}

function afficher(acces: AccesDonnees): void {
  const carte = document.createElement("section");
  carte.className = "accueil-vide";
  carte.setAttribute("aria-label", "Pour commencer");

  const titre = document.createElement("h2");
  titre.textContent = "Pour commencer, il vous faut un référentiel";
  const texte = document.createElement("p");
  texte.textContent =
    "DNMAX démarre vide : aucun référentiel ni aucune donnée n'est installé d'office. " +
    `Vous pouvez recevoir celui du ${REFERENTIEL_PROPOSE.nom}, recevoir celui d'un autre enseignant, ` +
    "ou construire le vôtre dans l'onglet Référentiel.";
  const erreur = document.createElement("p");
  erreur.className = "accueil-erreur";
  erreur.hidden = true;

  const etapes = document.createElement("ol");
  etapes.append(
    creerEtape(
      "1",
      `Téléchargez le référentiel ${REFERENTIEL_PROPOSE.nom} (votre navigateur l'enregistre).`,
      creerBouton("Télécharger", "btn", () => {
        ouvrirDansNavigateur(REFERENTIEL_PROPOSE.adresse).catch(() => {
          erreur.textContent = `Le navigateur n'a pas pu être ouvert. Adresse du fichier : ${REFERENTIEL_PROPOSE.adresse}`;
          erreur.hidden = false;
        });
      }),
    ),
    creerEtape(
      "2",
      "Ouvrez le fichier téléchargé : DNMAX vous montre ce qu'il contient avant de l'installer.",
      creerBouton("Recevoir le fichier…", "btn primary", () => {
        ouvrirReception(acces);
      }),
    ),
  );
  const pied = document.createElement("p");
  pied.textContent = "Pour simplement découvrir l'application, utilisez « charge un exemple » ci-dessous.";
  const fermer = creerBouton("Masquer", "btn ghost", () => {
    carte.remove();
  });
  carte.append(titre, texte, etapes, erreur, pied, fermer);
  document.querySelector("main")?.prepend(carte);
}

/**
 * Sur une installation encore vide (aucun référentiel renseigné, aucune
 * évaluation), affiche comment obtenir un référentiel.
 */
export async function proposerPremiersPas(acces: AccesDonnees): Promise<void> {
  const entrees = acces.lireEntrees();
  if (lireEvaluations(entrees[CLE_EVALUATIONS]).length > 0) {
    return;
  }
  const catalogue = await acces.dresserCatalogue(entrees);
  if (catalogue.every((referentiel) => estReferentielVide(referentiel.contenu))) {
    afficher(acces);
  }
}
