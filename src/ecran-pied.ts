// SPDX-License-Identifier: CECILL-2.1
import "./ecran-pied.css";
import { ADRESSE_CODE_SOURCE, ADRESSE_RETOURS, ADRESSE_SITE, LICENCE } from "./configuration";
import { construireAdresseRetours, deduireSysteme } from "./domaine/adresse-retours";
import { aideMiseAJour, indicationMiseAJour, rechercheAutomatiqueDue } from "./domaine/pied-de-page";
import { ecrireReglage, lireReglagesBruts } from "./ecran-regles";
import { montrerConfidentialite, montrerDocumentation, montrerLicence } from "./ecran-documentation";
import { creer, creerBouton, ouvrirBoite, type AccesDonnees } from "./ecran-echange";
import { rechercherMiseAJour, suivreMiseAJour } from "./ecran-mise-a-jour";
import { lireVersion, ouvrirDansNavigateur } from "./enveloppe";

/** Présentation de DNMAX : version, objet, licence (consultable), éditeur et code source. */
function montrerAPropos(versionInstallee: Promise<string>, adresseRetours: Promise<string>): void {
  const { boite, fermer } = ouvrirBoite("À propos de DNMAX");
  // La même icône que dans la barre des tâches et la fenêtre.
  const icone = creer("img", "apropos-icone");
  icone.setAttribute("src", "/icone.svg");
  icone.setAttribute("alt", "");
  const version = creer("p", "apropos-version", "DNMAX");
  void versionInstallee.then((numero) => {
    version.textContent = numero === "" ? "DNMAX" : `DNMAX, version ${numero}`;
  });
  const message = creer("p", "echange-erreur");
  message.setAttribute("role", "status");
  message.hidden = true;
  const lien = (texte: string, adresse: string | Promise<string>): HTMLButtonElement =>
    creerBouton(texte, "lnk", () => {
      void Promise.resolve(adresse).then((adresseConnue) =>
        ouvrirDansNavigateur(adresseConnue).catch(() => {
          message.textContent = `Le navigateur n'a pas pu être ouvert. Adresse : ${adresseConnue}`;
          message.hidden = false;
        }),
      );
    });
  const licence = creer("p", "");
  licence.append(
    `DNMAX est un logiciel libre, distribué sous licence ${LICENCE} : vous pouvez l'utiliser, l'étudier, le modifier et le redistribuer aux mêmes conditions. Il est fourni sans garantie. `,
    creerBouton("Lire la licence", "lnk", () => {
      fermer();
      montrerLicence();
    }),
  );
  const liens = creer("div", "compte-liens");
  liens.append(
    lien("Proposer une idée ou signaler un bug", adresseRetours),
    lien("Site du projet", ADRESSE_SITE),
    lien("Code source", ADRESSE_CODE_SOURCE),
  );
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer));
  boite.append(
    icone,
    version,
    creer(
      "p",
      "",
      "DNMAX aide les enseignants de DN MADE à construire, suivre et restituer leurs évaluations par compétences, à partir du référentiel du diplôme. " +
        "C'est une application de bureau autonome : vos données restent sur cet ordinateur, chiffrées par votre mot de passe, et ne s'échangent avec vos collègues que par fichier ou d'ordinateur à ordinateur.",
    ),
    licence,
    creer("p", "", "Conçu et maintenu par Stéphane Héberlé, à titre bénévole. Contact : contact@dnmax.fr."),
    creer("p", "apropos-note", "Les liens ci-dessous s'ouvrent dans votre navigateur ; la documentation et la page Confidentialité, elles, se lisent sans connexion depuis le bas de la fenêtre."),
    liens,
    message,
    actions,
  );
}

/**
 * Ajoute en bas de l'application une ligne discrète, centrée : la version
 * (un clic lance la recherche de mise à jour, et l'indicateur en dit l'issue),
 * puis « Licence », « À propos », « Confidentialité », « Documentation » et
 * « Proposer une idée ou signaler un bug ». Licence, Confidentialité et
 * Documentation s'affichent dans l'application, sans connexion.
 *
 * DNMAX ne se connecte jamais sans l'accord de l'enseignant : l'indicateur reste
 * muet tant qu'il n'a pas lancé de recherche (ici ou dans Paramètres), ou activé
 * la recherche automatique.
 */
export function installerPiedDePage(acces: AccesDonnees): void {
  const pied = creer("footer", "pied-app");
  const versionInstallee = lireVersion();
  const version = creerBouton("DNMAX", "lnk pied-version", () => {
    void rechercherMiseAJour(() => acces.enregistrerMaintenant());
  });
  const pastille = creer("span", "pied-pastille");
  pastille.setAttribute("aria-hidden", "true");
  const nomVersion = creer("span", "", "DNMAX");
  const indication = creer("span", "pied-indication");
  version.replaceChildren(nomVersion, pastille, indication);
  void versionInstallee.then((numero) => {
    if (numero !== "") {
      nomVersion.textContent = `DNMAX ${numero}`;
    }
  });
  suivreMiseAJour((etat) => {
    version.dataset.etat = etat;
    indication.textContent = indicationMiseAJour(etat);
    version.title = aideMiseAJour(etat);
    version.disabled = etat === "en-cours";
  });
  const message = creer("span", "pied-message");
  message.setAttribute("role", "status");
  message.hidden = true;
  const adresseRetours = (): Promise<string> =>
    versionInstallee.then((numero) => construireAdresseRetours(ADRESSE_RETOURS, numero, deduireSysteme(navigator.userAgent)));
  const liens = creer("nav", "pied-liens");
  liens.setAttribute("aria-label", "Liens utiles");
  liens.append(
    version,
    creerBouton("Licence", "lnk", montrerLicence),
    creerBouton("À propos", "lnk", () => {
      montrerAPropos(versionInstallee, adresseRetours());
    }),
    creerBouton("Confidentialité", "lnk", montrerConfidentialite),
    creerBouton("Documentation", "lnk", () => {
      montrerDocumentation();
    }),
    creerBouton("Proposer une idée ou signaler un bug", "lnk", () => {
      message.hidden = true;
      void adresseRetours()
        .then((adresse) => ouvrirDansNavigateur(adresse))
        .catch(() => {
          message.textContent = "Le navigateur n'a pas pu s'ouvrir.";
          message.hidden = false;
        });
    }),
  );
  pied.append(liens, message);
  document.body.append(pied);
  // La page et les annonces flottantes laissent la place du pied, dont la hauteur varie (message, retour à la ligne).
  const reserverPlace = (): void => {
    document.documentElement.style.setProperty("--hauteur-pied", `${String(pied.offsetHeight)}px`);
  };
  new ResizeObserver(reserverPlace).observe(pied);
  reserverPlace();
}

/** Branche le panneau « Mises à jour » de Paramètres : même recherche, même indicateur que le bas de page. */
export function installerMisesAJourParametres(acces: AccesDonnees): void {
  const bouton = document.getElementById("bMiseAJour");
  const etatAffiche = document.getElementById("etatMiseAJour");
  if (!(bouton instanceof HTMLButtonElement) || etatAffiche === null) {
    return;
  }
  document.getElementById("panneau-mises-a-jour")?.removeAttribute("hidden");
  bouton.addEventListener("click", () => {
    void rechercherMiseAJour(() => acces.enregistrerMaintenant());
  });
  // Recherche automatique : activée seulement par l'enseignant, une fois par jour au plus (décision 36).
  const caseAuto = document.getElementById("r-recherche-auto");
  if (caseAuto instanceof HTMLInputElement) {
    caseAuto.checked = lireReglagesBruts(acces).rechercheAutomatique === true;
    caseAuto.addEventListener("change", () => {
      ecrireReglage(acces, "rechercheAutomatique", caseAuto.checked);
    });
  }
  const reglages = lireReglagesBruts(acces);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const derniere = typeof reglages.derniereRechercheAutomatique === "string" ? reglages.derniereRechercheAutomatique : "";
  if (rechercheAutomatiqueDue(reglages.rechercheAutomatique === true, derniere, aujourdHui)) {
    ecrireReglage(acces, "derniereRechercheAutomatique", aujourdHui);
    void rechercherMiseAJour(() => acces.enregistrerMaintenant());
  }
  suivreMiseAJour((etat) => {
    bouton.disabled = etat === "en-cours";
    etatAffiche.textContent =
      etat === "inconnu"
        ? "Aucune recherche lancée depuis l'ouverture de DNMAX."
        : `Dernière recherche : ${indicationMiseAJour(etat)}${etat === "disponible" ? ", proposée en bas à droite de la fenêtre" : ""}.`;
  });
}
