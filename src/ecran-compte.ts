// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-compte.css";
import { ADRESSE_CODE_SOURCE, ADRESSE_RETOURS, ADRESSE_SITE, LICENCE } from "./configuration";
import { decrireVerification } from "./domaine/annonce-mise-a-jour";
import { LONGUEUR_MAXIMALE_NOM } from "./domaine/identite";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE, verifierNouveauMotDePasse } from "./domaine/saisie-coffre";
import { messagePourErreur } from "./ecran-coffre";
import { creer, creerBouton, ouvrirBoite, type AccesDonnees } from "./ecran-echange";
import { verifierMiseAJour } from "./ecran-mise-a-jour";
import { changerMotDePasse, lireVersion, ouvrirDansNavigateur } from "./enveloppe";

const IDENTIFIANT_BOUTON = "bouton-compte";

function creerChamp(type: "text" | "password", libelle: string, completion: AutoFill): { ligne: HTMLElement; champ: HTMLInputElement } {
  const ligne = creer("label", "compte-champ", libelle);
  const champ = creer("input");
  champ.type = type;
  champ.autocomplete = completion;
  ligne.append(champ);
  return { ligne, champ };
}

/** Zone de message d'une rubrique : succès ou erreur, vidée à chaque nouvelle tentative. */
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

function creerRubriqueNom(acces: AccesDonnees): HTMLElement {
  const rubrique = creer("section", "compte-rubrique");
  const { ligne, champ } = creerChamp("text", "Votre nom, tel que les autres enseignants le lisent", "name");
  champ.value = acces.identite.nom;
  champ.maxLength = LONGUEUR_MAXIMALE_NOM;
  const { zone, dire } = creerMessage();
  const formulaire = creer("form", "compte-formulaire");
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    if (acces.renommer(champ.value)) {
      champ.value = acces.identite.nom;
      dire("Nom enregistré. Il accompagnera vos prochaines modifications et vos prochains envois.", false);
    } else {
      dire("Indiquez un nom.", true);
    }
  });
  const enregistrer = creer("button", "btn", "Enregistrer le nom");
  enregistrer.type = "submit";
  formulaire.append(ligne, enregistrer);
  rubrique.append(creer("h3", "", "Votre nom"), formulaire, zone);
  return rubrique;
}

function creerRubriqueMotDePasse(acces: AccesDonnees): HTMLElement {
  const rubrique = creer("section", "compte-rubrique");
  const ancien = creerChamp("password", "Mot de passe actuel", "current-password");
  const nouveau = creerChamp(
    "password",
    `Nouveau mot de passe (${String(LONGUEUR_MINIMALE_MOT_DE_PASSE)} caractères au moins)`,
    "new-password",
  );
  const confirmation = creerChamp("password", "Nouveau mot de passe, une seconde fois", "new-password");
  const { zone, dire } = creerMessage();
  const changer = creer("button", "btn", "Changer le mot de passe");
  changer.type = "submit";
  const formulaire = creer("form", "compte-formulaire");
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const defaut = verifierNouveauMotDePasse(nouveau.champ.value, confirmation.champ.value);
    if (defaut !== null) {
      dire(
        defaut === "trop-court"
          ? `Le nouveau mot de passe doit compter au moins ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE)} caractères.`
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
  formulaire.append(ancien.ligne, nouveau.ligne, confirmation.ligne, changer);
  rubrique.append(creer("h3", "", "Mot de passe"), formulaire, zone);
  return rubrique;
}

function creerLien(texte: string, adresse: string, dire: (texte: string, erreur: boolean) => void): HTMLButtonElement {
  return creerBouton(texte, "lnk", () => {
    ouvrirDansNavigateur(adresse).catch(() => {
      dire(`Le navigateur n'a pas pu être ouvert. Adresse : ${adresse}`, true);
    });
  });
}

function creerVerificationMiseAJour(acces: AccesDonnees, versionInstallee: Promise<string>): HTMLElement {
  const bloc = creer("div", "compte-formulaire");
  const { zone, dire } = creerMessage();
  const verifier = creerBouton("Rechercher une mise à jour", "btn", () => {
    verifier.disabled = true;
    zone.hidden = true;
    void Promise.all([verifierMiseAJour(() => acces.enregistrerMaintenant()), versionInstallee]).then(([issue, numero]) => {
      verifier.disabled = false;
      if (issue === null) {
        dire("Une nouvelle version est proposée en bas à droite de la fenêtre.", false);
      } else {
        dire(decrireVerification(issue, numero), issue === "impossible");
      }
    });
  });
  bloc.append(
    creer(
      "p",
      "",
      "DNMAX ne se connecte à Internet que lorsque vous le demandez ici : il interroge alors le dépôt du projet sur GitHub, sans rien transmettre de vos données.",
    ),
    verifier,
    zone,
  );
  return bloc;
}

function creerRubriqueAPropos(acces: AccesDonnees): HTMLElement {
  const rubrique = creer("section", "compte-rubrique");
  const version = creer("p", "", "DNMAX");
  const versionInstallee = lireVersion();
  void versionInstallee.then((numero) => {
    version.textContent = numero === "" ? "DNMAX" : `DNMAX, version ${numero}`;
  });
  const { zone, dire } = creerMessage();
  const liens = creer("div", "compte-liens");
  liens.append(
    creerLien("Proposer une idée ou signaler un bug", ADRESSE_RETOURS, dire),
    creerLien("Site et documentation", ADRESSE_SITE, dire),
    creerLien("Code source", ADRESSE_CODE_SOURCE, dire),
  );
  rubrique.append(
    creer("h3", "", "À propos"),
    version,
    creer(
      "p",
      "",
      `Logiciel libre sous licence ${LICENCE} : vous pouvez l'utiliser, l'étudier, le modifier et le redistribuer aux mêmes conditions. ` +
        "Vos données restent sur cet ordinateur ; ces liens s'ouvrent dans votre navigateur.",
    ),
    creerVerificationMiseAJour(acces, versionInstallee),
    liens,
    zone,
  );
  return rubrique;
}

function montrerCompte(acces: AccesDonnees): void {
  const { boite, fermer } = ouvrirBoite("Mon compte");
  const contenu = creer("div", "compte-contenu");
  contenu.append(creerRubriqueNom(acces), creerRubriqueMotDePasse(acces), creerRubriqueAPropos(acces));
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer));
  boite.append(contenu, actions);
}

/** Rend visible le bouton « Mon compte… » de l'en-tête et le branche. */
export function installerCompte(acces: AccesDonnees): void {
  const bouton = document.getElementById(IDENTIFIANT_BOUTON);
  if (bouton === null) {
    return;
  }
  bouton.hidden = false;
  bouton.addEventListener("click", () => {
    montrerCompte(acces);
  });
}
