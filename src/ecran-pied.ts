// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-pied.css";
import { ADRESSE_CODE_SOURCE, ADRESSE_CONFIDENTIALITE, ADRESSE_RETOURS, ADRESSE_SITE, LICENCE } from "./configuration";
import { construireAdresseRetours, deduireSysteme } from "./domaine/adresse-retours";
import { decrireVerification } from "./domaine/annonce-mise-a-jour";
import { creer, creerBouton, ouvrirBoite, type AccesDonnees } from "./ecran-echange";
import { verifierMiseAJour } from "./ecran-mise-a-jour";
import { lireVersion, ouvrirDansNavigateur } from "./enveloppe";

/** Version, licence et liens du projet ; l'adresse des retours n'est connue qu'une fois la version lue. */
function montrerAPropos(versionInstallee: Promise<string>, adresseRetours: Promise<string>): void {
  const { boite, fermer } = ouvrirBoite("À propos");
  const version = creer("p", "", "DNMAX");
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
  const liens = creer("div", "compte-liens");
  liens.append(
    lien("Proposer une idée ou signaler un bug", adresseRetours),
    lien("Site et documentation", ADRESSE_SITE),
    lien("Code source", ADRESSE_CODE_SOURCE),
  );
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer));
  boite.append(
    version,
    creer(
      "p",
      "",
      `Logiciel libre sous licence ${LICENCE} : vous pouvez l'utiliser, l'étudier, le modifier et le redistribuer aux mêmes conditions. ` +
        "Vos données restent sur cet ordinateur ; ces liens s'ouvrent dans votre navigateur.",
    ),
    liens,
    message,
    actions,
  );
}

/**
 * Ajoute en bas de l'application une ligne discrète : version et licence,
 * « Rechercher une mise à jour », puis les liens « À propos »,
 * « Confidentialité », « Site et documentation » et « Proposer une idée ou
 * signaler un bug ». Les liens s'ouvrent dans le navigateur ; « À propos »
 * ouvre une boîte avec la version, la licence et le code source. La recherche
 * de mise à jour est le seul endroit d'où DNMAX interroge le dépôt du projet,
 * et seulement sur clic.
 */
export function installerPiedDePage(acces: AccesDonnees): void {
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
  const adresseRetours = (): Promise<string> =>
    versionInstallee.then((numero) => construireAdresseRetours(ADRESSE_RETOURS, numero, deduireSysteme(navigator.userAgent)));
  const liens = creer("nav", "pied-liens");
  liens.setAttribute("aria-label", "Liens utiles");
  liens.append(
    rechercher,
    creerBouton("À propos", "lnk", () => {
      montrerAPropos(versionInstallee, adresseRetours());
    }),
    creerBouton("Confidentialité", "lnk", () => {
      ouvrir(ADRESSE_CONFIDENTIALITE);
    }),
    creerBouton("Site et documentation", "lnk", () => {
      ouvrir(ADRESSE_SITE);
    }),
    creerBouton("Proposer une idée ou signaler un bug", "lnk", () => {
      ouvrir(adresseRetours());
    }),
  );
  pied.append(identite, liens, message);
  document.body.append(pied);
  // La page et les annonces flottantes laissent la place du pied, dont la hauteur varie (message, retour à la ligne).
  const reserverPlace = (): void => {
    document.documentElement.style.setProperty("--hauteur-pied", `${String(pied.offsetHeight)}px`);
  };
  new ResizeObserver(reserverPlace).observe(pied);
  reserverPlace();
}
