// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-pied.css";
import { ADRESSE_CONFIDENTIALITE, ADRESSE_RETOURS, ADRESSE_SITE, LICENCE } from "./configuration";
import { construireAdresseRetours, deduireSysteme } from "./domaine/adresse-retours";
import { creer, creerBouton } from "./ecran-echange";
import { lireVersion, ouvrirDansNavigateur } from "./enveloppe";

const IDENTIFIANT_BOUTON_COMPTE = "bouton-compte";

/**
 * Ajoute en bas de l'application une ligne discrète : version et licence,
 * puis les liens « À propos », « Confidentialité », « Site et documentation »
 * et « Proposer une idée ou signaler un bug ». Les liens s'ouvrent dans le
 * navigateur ; « À propos » ouvre « Mon compte », qui le contient.
 */
export function installerPiedDePage(): void {
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
  const erreur = creer("span", "pied-erreur");
  erreur.setAttribute("role", "status");
  erreur.hidden = true;
  const ouvrir = (adresse: string | Promise<string>): void => {
    erreur.hidden = true;
    void Promise.resolve(adresse)
      .then((adresseConnue) => ouvrirDansNavigateur(adresseConnue))
      .catch(() => {
        erreur.textContent = "Le navigateur n'a pas pu s'ouvrir.";
        erreur.hidden = false;
      });
  };
  const liens = creer("nav", "pied-liens");
  liens.setAttribute("aria-label", "Liens utiles");
  liens.append(
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
  pied.append(identite, liens, erreur);
  zone.append(pied);
}
