// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-pied.css";
import { ADRESSE_CONFIDENTIALITE, ADRESSE_RETOURS, ADRESSE_SITE, LICENCE } from "./configuration";
import { construireAdresseRetours, deduireSysteme } from "./domaine/adresse-retours";
import { decrireVerification } from "./domaine/annonce-mise-a-jour";
import { creer, creerBouton, type AccesDonnees } from "./ecran-echange";
import { verifierMiseAJour } from "./ecran-mise-a-jour";
import { lireVersion, ouvrirDansNavigateur } from "./enveloppe";

const IDENTIFIANT_BOUTON_COMPTE = "bouton-compte";

/**
 * Ajoute en bas de l'application une ligne discrète : version et licence,
 * « Rechercher une mise à jour », puis les liens « À propos »,
 * « Confidentialité », « Site et documentation » et « Proposer une idée ou
 * signaler un bug ». Les liens s'ouvrent dans le navigateur ; « À propos »
 * ouvre « Mon compte », qui le contient. La recherche de mise à jour est le
 * seul endroit d'où DNMAX interroge le dépôt du projet, et seulement sur clic.
 */
export function installerPiedDePage(acces: AccesDonnees): void {
  const zone = document.querySelector("main");
  if (zone === null) {
    return;
  }
  const pied = creer("footer", "pied-app");
  const identite = creer("span", "pied-identite", `DNMAX · licence ${LICENCE}`);
  const versionInstallee = lireVersion();
  void versionInstallee.then((numero) => {
    if (numero !== "") {
      identite.textContent = `DNMAX ${numero} · licence ${LICENCE}`;
    }
  });
  const message = creer("span", "pied-message");
  message.setAttribute("role", "status");
  message.hidden = true;
  const dire = (texte: string, estErreur: boolean): void => {
    message.textContent = texte;
    message.className = estErreur ? "pied-message pied-erreur" : "pied-message";
    message.hidden = false;
  };
  const ouvrir = (adresse: string | Promise<string>): void => {
    message.hidden = true;
    void Promise.resolve(adresse)
      .then((adresseConnue) => ouvrirDansNavigateur(adresseConnue))
      .catch(() => {
        dire("Le navigateur n'a pas pu s'ouvrir.", true);
      });
  };
  const rechercher = creerBouton("Rechercher une mise à jour", "lnk", () => {
    rechercher.disabled = true;
    dire("Recherche d'une mise à jour…", false);
    void Promise.all([verifierMiseAJour(() => acces.enregistrerMaintenant()), versionInstallee]).then(([issue, numero]) => {
      rechercher.disabled = false;
      if (issue === null) {
        dire("Une nouvelle version vous est proposée.", false);
      } else {
        dire(decrireVerification(issue, numero), issue === "impossible");
      }
    });
  });
  rechercher.title = "DNMAX interroge alors le dépôt du projet sur GitHub, sans rien transmettre de vos données.";
  const liens = creer("nav", "pied-liens");
  liens.setAttribute("aria-label", "Liens utiles");
  liens.append(
    rechercher,
    creerBouton("À propos", "lnk", () => {
      document.getElementById(IDENTIFIANT_BOUTON_COMPTE)?.click();
    }),
    creerBouton("Confidentialité", "lnk", () => {
      ouvrir(ADRESSE_CONFIDENTIALITE);
    }),
    creerBouton("Site et documentation", "lnk", () => {
      ouvrir(ADRESSE_SITE);
    }),
    creerBouton("Proposer une idée ou signaler un bug", "lnk", () => {
      ouvrir(versionInstallee.then((numero) => construireAdresseRetours(ADRESSE_RETOURS, numero, deduireSysteme(navigator.userAgent))));
    }),
  );
  pied.append(identite, liens, message);
  zone.append(pied);
}
