// SPDX-License-Identifier: AGPL-3.0-or-later
import "@fontsource/bricolage-grotesque/400.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/public-sans/400-italic.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import { EnregistreurDiffere, type Minuteur } from "./domaine/enregistrement-differe";
import { MagasinMemoire, type Entrees } from "./domaine/magasin-memoire";
import { CLE_EVALUATIONS } from "./domaine/echange/modele";
import {
  CLE_DATES_MODIFICATION,
  lireDatesModification,
  mettreAJourDates,
} from "./domaine/echange/suivi-modifications";
import { CLE_IDENTITE, creerIdentite, lireIdentite } from "./domaine/identite";
import { proposerPremiersPas } from "./ecran-accueil";
import { installerCompte } from "./ecran-compte";
import { installerPiedDePage } from "./ecran-pied";
import { rappelerConservation } from "./ecran-droits-eleves";
import { demanderIdentite, demanderOuvertureCoffre, signalerEnregistrement } from "./ecran-coffre";
import { installerEchange, type AccesDonnees } from "./ecran-echange";
import { suivreExemple } from "./ecran-exemple";
import { proposerOuvertureExport } from "./ecran-export";
import {
  attendreAvantFermeture,
  enregistrerCoffre,
  estDansEnveloppe,
  lireCoffre,
  lireEtatCoffre,
} from "./enveloppe";
import { chargerInterfaceHistorique } from "./heritage/pont";
import { dresserCatalogue } from "./heritage/referentiels";

const NOM_APPLICATION = "DNMAX";

/** Silence attendu après la dernière modification avant d'écrire le coffre. */
const DELAI_ENREGISTREMENT_MS = 400;

/** Classe posée sur la page par `index.html` tant que le coffre est fermé. */
const CLASSE_COFFRE_FERME = "coffre-ferme";

const MINUTEUR_NAVIGATEUR: Minuteur = {
  armer: (rappel, delaiMs) => window.setTimeout(rappel, delaiMs),
  desarmer: (jeton) => {
    if (typeof jeton === "number") {
      window.clearTimeout(jeton);
    }
  },
};

async function ouvrirDonnees(): Promise<Entrees> {
  const etat = await lireEtatCoffre();
  // Déjà ouvert : la page a été rechargée en cours de session, inutile de redemander le mot de passe.
  return etat === "ouvert" ? await lireCoffre() : await demanderOuvertureCoffre(etat === "verrouille");
}

/** Application ouverte dans son enveloppe : magasin enregistré dans le coffre, et de quoi échanger. */
async function creerMagasinProtege(): Promise<{ magasin: MagasinMemoire; acces: AccesDonnees }> {
  const entrees = await ouvrirDonnees();
  const enregistreur = new EnregistreurDiffere(
    enregistrerCoffre,
    DELAI_ENREGISTREMENT_MS,
    MINUTEUR_NAVIGATEUR,
    (resultat) => {
      signalerEnregistrement(resultat.reussi, resultat.reussi ? undefined : resultat.erreur);
    },
  );
  await attendreAvantFermeture(() => enregistreur.vider());

  // Un coffre créé avant l'identification des enseignants n'a pas encore d'identité.
  const identiteConnue = lireIdentite(entrees[CLE_IDENTITE]);
  let identite = identiteConnue ?? (await demanderIdentite(() => crypto.randomUUID()));

  let evaluationsConnues = entrees[CLE_EVALUATIONS];
  const magasin: MagasinMemoire = new MagasinMemoire(entrees, (entreesAJour) => {
    const dates = mettreAJourDates(
      evaluationsConnues,
      entreesAJour[CLE_EVALUATIONS],
      lireDatesModification(entreesAJour[CLE_DATES_MODIFICATION]),
      new Date(),
      identite.nom,
    );
    evaluationsConnues = entreesAJour[CLE_EVALUATIONS];
    if (dates !== null) {
      // Cette écriture rappelle la présente fonction, qui planifiera alors l'enregistrement.
      magasin.setItem(CLE_DATES_MODIFICATION, JSON.stringify(dates));
      return;
    }
    enregistreur.planifier(entreesAJour);
  });

  if (identiteConnue === null) {
    magasin.setItem(CLE_IDENTITE, JSON.stringify(identite));
  }

  const acces: AccesDonnees = {
    get identite() {
      return identite;
    },
    renommer: (nom) => {
      const renommee = creerIdentite(nom, identite.id);
      if (renommee === null) {
        return false;
      }
      identite = renommee;
      magasin.setItem(CLE_IDENTITE, JSON.stringify(identite));
      return true;
    },
    dresserCatalogue,
    enregistrerMaintenant: () => enregistreur.vider(),
    ecrireEntree: (cle, valeur) => {
      magasin.setItem(cle, valeur);
    },
    lireEntrees: () => magasin.entrees(),
    remplacerEntrees: async (nouvelles) => {
      // Les dates en dernier : écrire les évaluations les redate à « maintenant »,
      // et ce sont les dates portées par le plan d'import qui doivent rester.
      const cles = Object.keys(nouvelles).sort(
        (cleA, cleB) => Number(cleA === CLE_DATES_MODIFICATION) - Number(cleB === CLE_DATES_MODIFICATION),
      );
      for (const cle of cles) {
        const valeur = nouvelles[cle];
        if (valeur !== undefined) {
          magasin.setItem(cle, valeur);
        }
      }
      for (const cle of Object.keys(magasin.entrees())) {
        if (!(cle in nouvelles)) {
          magasin.removeItem(cle);
        }
      }
      await enregistreur.vider();
      // L'interface historique ne lit ses données qu'au chargement.
      window.location.reload();
    },
  };
  return { magasin, acces };
}

async function demarrer(): Promise<void> {
  // Hors de l'enveloppe (page ouverte dans un navigateur pendant le développement),
  // il n'y a ni coffre ni boîtes de dialogue du système : les données ne vivent
  // que le temps de la session et l'échange n'est pas proposé.
  if (!estDansEnveloppe()) {
    document.documentElement.classList.remove(CLASSE_COFFRE_FERME);
    await chargerInterfaceHistorique(new MagasinMemoire({}, () => undefined));
    return;
  }
  const { magasin, acces } = await creerMagasinProtege();
  document.documentElement.classList.remove(CLASSE_COFFRE_FERME);
  await chargerInterfaceHistorique(magasin, proposerOuvertureExport);
  installerEchange(acces);
  suivreExemple(acces);
  rappelerConservation(acces);
  installerCompte(acces);
  installerPiedDePage();
  await proposerPremiersPas(acces);
}

function afficherEchecDemarrage(erreur: unknown): void {
  const message = erreur instanceof Error ? erreur.message : String(erreur);
  const alerte = document.createElement("p");
  alerte.setAttribute("role", "alert");
  alerte.textContent = `${NOM_APPLICATION} n'a pas pu démarrer : ${message}`;
  document.body.prepend(alerte);
}

demarrer().catch(afficherEchecDemarrage);
