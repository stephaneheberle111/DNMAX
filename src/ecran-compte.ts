// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-compte.css";
import { longueurMinimaleExigee, verifierNouveauMotDePasse } from "./domaine/saisie-coffre";
import { moduleElevesActif } from "./domaine/securite";
import { messagePourErreur } from "./ecran-coffre";
import { creer, creerBouton, ouvrirBoite, type AccesDonnees } from "./ecran-echange";
import { changerMotDePasse } from "./enveloppe";

const IDENTIFIANT_BOUTON = "bouton-compte";
const IDENTIFIANT_MENU = "menu-compte";

function creerChamp(type: "text" | "password", libelle: string, completion: AutoFill): { ligne: HTMLElement; champ: HTMLInputElement } {
  const ligne = creer("label", "compte-champ", libelle);
  const champ = creer("input");
  champ.type = type;
  champ.autocomplete = completion;
  ligne.append(champ);
  return { ligne, champ };
}

/** Zone de message : succès ou erreur, vidée à chaque nouvelle tentative. */
function creerMessage(): { zone: HTMLElement; dire: (texte: string, erreur: boolean) => void } {
  const zone = creer("p", "compte-message");
  zone.setAttribute("role", "status");
  zone.hidden = true;
  return {
    zone,
    dire: (texte, erreur) => {
      zone.textContent = texte;
      zone.className = erreur ? "compte-message echange-erreur" : "compte-message";
      zone.hidden = false;
    },
  };
}

function montrerMotDePasse(acces: AccesDonnees): void {
  const { boite, fermer } = ouvrirBoite("Mot de passe");
  boite.classList.add("boite-etroite");
  // Le module Élèves exige un mot de passe plus long (voir `longueurMinimaleExigee`).
  const longueurMinimale = longueurMinimaleExigee(moduleElevesActif(acces.lireEntrees()));
  const ancien = creerChamp("password", "Mot de passe actuel", "current-password");
  const nouveau = creerChamp("password", `Nouveau mot de passe (${String(longueurMinimale)} caractères au moins)`, "new-password");
  const confirmation = creerChamp("password", "Nouveau mot de passe, une seconde fois", "new-password");
  const { zone, dire } = creerMessage();
  const changer = creer("button", "btn primary", "Changer le mot de passe");
  changer.type = "submit";
  const formulaire = creer("form", "compte-formulaire");
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const defaut = verifierNouveauMotDePasse(nouveau.champ.value, confirmation.champ.value, longueurMinimale);
    if (defaut !== null) {
      dire(
        defaut === "trop-court"
          ? `Le nouveau mot de passe doit compter au moins ${String(longueurMinimale)} caractères.`
          : "Les deux saisies du nouveau mot de passe ne sont pas identiques.",
        true,
      );
      return;
    }
    changer.disabled = true;
    // Ce qui est en attente est écrit d'abord : le changement réécrit le fichier des données.
    acces
      .enregistrerMaintenant()
      .then(() => changerMotDePasse(ancien.champ.value, nouveau.champ.value))
      .then(() => {
        for (const { champ } of [ancien, nouveau, confirmation]) {
          champ.value = "";
        }
        dire("Mot de passe changé. Votre code de secours reste le même.", false);
      })
      .catch((erreur: unknown) => {
        dire(messagePourErreur(erreur), true);
      })
      .finally(() => {
        changer.disabled = false;
      });
  });
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer), changer);
  formulaire.append(ancien.ligne, nouveau.ligne, confirmation.ligne, zone, actions);
  boite.append(
    creer("p", "", "Le mot de passe protège les données enregistrées sur cet ordinateur. Votre code de secours ne change pas."),
    formulaire,
  );
  ancien.champ.focus();
}

/** Ouvre la page Préférences, tenue par l'interface historique. */
function ouvrirPreferences(): void {
  window.dnmaxPont?.ouvrirPreferences?.();
}

/**
 * Rend visible le menu « Mon compte » de la barre du haut et le branche :
 * « Mot de passe… » (seulement dans l'enveloppe de bureau, qui tient le coffre)
 * et « Préférences ». Le menu se ferme par Échap, un clic ailleurs ou le choix
 * d'une entrée ; les flèches passent d'une entrée à l'autre.
 *
 * @param acces `null` hors de l'enveloppe : le menu ne propose alors que les préférences.
 */
export function installerCompte(acces: AccesDonnees | null): void {
  const bouton = document.getElementById(IDENTIFIANT_BOUTON);
  if (bouton === null || bouton.parentElement === null) {
    return;
  }
  // Type non nul déclaré : la fonction `fermer`, plus bas, ne profite pas de la vérification ci-dessus.
  const declencheur: HTMLElement = bouton;
  const menu = creer("div", "menu-compte");
  menu.id = IDENTIFIANT_MENU;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-labelledby", IDENTIFIANT_BOUTON);
  menu.hidden = true;
  const nom = creer("div", "menu-compte-nom");
  nom.setAttribute("role", "presentation");
  const entrees: HTMLButtonElement[] = [];
  const ajouterEntree = (libelle: string, detail: string, action: () => void): void => {
    const entree = creerBouton("", "menu-compte-entree", () => {
      fermer(false);
      action();
    });
    entree.setAttribute("role", "menuitem");
    entree.tabIndex = -1;
    entree.append(creer("b", "", libelle), creer("span", "", detail));
    entrees.push(entree);
  };
  if (acces !== null) {
    ajouterEntree("Mot de passe…", "Changer le mot de passe de vos données", () => {
      montrerMotDePasse(acces);
    });
  }
  ajouterEntree("Préférences", "Échelles, vocabulaire, livrables, thème", ouvrirPreferences);
  menu.append(nom, ...entrees);
  bouton.parentElement.append(menu);
  bouton.setAttribute("aria-haspopup", "menu");
  bouton.setAttribute("aria-controls", IDENTIFIANT_MENU);
  bouton.setAttribute("aria-expanded", "false");

  const surClicAilleurs = (evenement: MouseEvent): void => {
    if (evenement.target instanceof Node && !menu.contains(evenement.target) && !bouton.contains(evenement.target)) {
      fermer(false);
    }
  };
  function fermer(rendreFocus: boolean): void {
    if (menu.hidden) {
      return;
    }
    menu.hidden = true;
    declencheur.setAttribute("aria-expanded", "false");
    document.removeEventListener("mousedown", surClicAilleurs);
    if (rendreFocus) {
      declencheur.focus();
    }
  }
  const ouvrir = (): void => {
    nom.textContent = acces === null ? "" : acces.identite.nom;
    nom.hidden = acces === null;
    menu.hidden = false;
    bouton.setAttribute("aria-expanded", "true");
    document.addEventListener("mousedown", surClicAilleurs);
    entrees[0]?.focus();
  };
  bouton.addEventListener("click", () => {
    if (menu.hidden) {
      ouvrir();
    } else {
      fermer(true);
    }
  });
  bouton.addEventListener("keydown", (evenement) => {
    if (evenement.key === "ArrowDown" && menu.hidden) {
      evenement.preventDefault();
      ouvrir();
    }
  });
  menu.addEventListener("keydown", (evenement) => {
    const rang = entrees.findIndex((entree) => entree === document.activeElement);
    if (evenement.key === "Escape") {
      evenement.preventDefault();
      // Les boîtes ouvertes écoutent aussi Échap : le menu se ferme seul.
      evenement.stopPropagation();
      fermer(true);
    } else if (evenement.key === "ArrowDown" || evenement.key === "ArrowUp") {
      evenement.preventDefault();
      const pas = evenement.key === "ArrowDown" ? 1 : -1;
      entrees[(rang + pas + entrees.length) % entrees.length]?.focus();
    } else if (evenement.key === "Tab") {
      fermer(false);
    }
  });
  bouton.hidden = false;
}
