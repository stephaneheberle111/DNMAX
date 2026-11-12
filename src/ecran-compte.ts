// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-compte.css";
import { ADRESSE_CODE_SOURCE, ADRESSE_RETOURS, ADRESSE_SITE, LICENCE } from "./configuration";
import { construireAdresseRetours, deduireSysteme } from "./domaine/adresse-retours";
import { LONGUEUR_MAXIMALE_NOM } from "./domaine/identite";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE, verifierNouveauMotDePasse } from "./domaine/saisie-coffre";
import { messagePourErreur } from "./ecran-coffre";
import { creer, creerBouton, ouvrirBoite, type AccesDonnees } from "./ecran-echange";
import { changerMotDePasse, lireVersion, ouvrirDansNavigateur } from "./enveloppe";
import { lancerParcours } from "./ecran-parcours";

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
  const prenom = creerChamp("text", "Votre prénom", "given-name");
  const nom = creerChamp("text", "Votre nom", "family-name");
  prenom.champ.value = acces.identite.prenom;
  nom.champ.value = acces.identite.nomFamille;
  prenom.champ.maxLength = LONGUEUR_MAXIMALE_NOM;
  nom.champ.maxLength = LONGUEUR_MAXIMALE_NOM;
  const { zone, dire } = creerMessage();
  const formulaire = creer("form", "compte-formulaire");
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    if (acces.renommer(prenom.champ.value, nom.champ.value)) {
      prenom.champ.value = acces.identite.prenom;
      nom.champ.value = acces.identite.nomFamille;
      dire(`Enregistré : ${acces.identite.nom}. Ce nom accompagnera vos prochaines modifications et vos prochains envois.`, false);
    } else {
      dire("Indiquez votre prénom et votre nom.", true);
    }
  });
  const enregistrer = creer("button", "btn", "Enregistrer le nom");
  enregistrer.type = "submit";
  formulaire.append(prenom.ligne, nom.ligne, enregistrer);
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

/** L'adresse peut n'être connue qu'après coup (version lue auprès de l'enveloppe). */
function creerLien(
  texte: string,
  adresse: string | Promise<string>,
  dire: (texte: string, erreur: boolean) => void,
): HTMLButtonElement {
  return creerBouton(texte, "lnk", () => {
    void Promise.resolve(adresse).then((adresseConnue) =>
      ouvrirDansNavigateur(adresseConnue).catch(() => {
        dire(`Le navigateur n'a pas pu être ouvert. Adresse : ${adresseConnue}`, true);
      }),
    );
  });
}

function creerRubriqueAPropos(): HTMLElement {
  const rubrique = creer("section", "compte-rubrique");
  const version = creer("p", "", "DNMAX");
  const versionInstallee = lireVersion();
  void versionInstallee.then((numero) => {
    version.textContent = numero === "" ? "DNMAX" : `DNMAX, version ${numero}`;
  });
  const { zone, dire } = creerMessage();
  const liens = creer("div", "compte-liens");
  liens.append(
    creerLien(
      "Proposer une idée ou signaler un bug",
      versionInstallee.then((numero) =>
        construireAdresseRetours(ADRESSE_RETOURS, numero, deduireSysteme(navigator.userAgent)),
      ),
      dire,
    ),
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
    liens,
    zone,
  );
  return rubrique;
}

function creerRubriqueVisites(fermer: () => void): HTMLElement {
  const rubrique = creer("section", "compte-rubrique");
  const liens = creer("div", "compte-liens");
  const visites = [
    ["prise-en-main", "Prise en main"],
    ["eleves", "Module Élèves"],
    ["niveaux", "Module Niveaux DN MADE"],
  ] as const;
  for (const [identifiant, libelle] of visites) {
    liens.append(
      creerBouton(libelle, "btn ghost", () => {
        fermer();
        lancerParcours(identifiant);
      }),
    );
  }
  rubrique.append(
    creer("h3", "", "Visites guidées"),
    creer("p", "", "Relancez une visite pas à pas : elle éclaire là où cliquer et repère ce que vous avez déjà fait."),
    liens,
  );
  return rubrique;
}

function montrerCompte(acces: AccesDonnees): void {
  const { boite, fermer } = ouvrirBoite("Mon compte");
  const contenu = creer("div", "compte-contenu");
  contenu.append(creerRubriqueNom(acces), creerRubriqueVisites(fermer), creerRubriqueMotDePasse(acces), creerRubriqueAPropos());
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
