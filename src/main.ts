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
import { demanderOuvertureCoffre, signalerEnregistrement } from "./ecran-coffre";
import {
  attendreAvantFermeture,
  enregistrerCoffre,
  estDansEnveloppe,
  lireCoffre,
  lireEtatCoffre,
} from "./enveloppe";
import { chargerInterfaceHistorique } from "./heritage/pont";

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

async function creerMagasinProtege(): Promise<MagasinMemoire> {
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
  return new MagasinMemoire(entrees, (entreesAJour) => {
    enregistreur.planifier(entreesAJour);
  });
}

async function demarrer(): Promise<void> {
  // Hors de l'enveloppe (page ouverte dans un navigateur pendant le développement),
  // il n'y a pas de coffre : les données ne vivent que le temps de la session.
  const magasin = estDansEnveloppe() ? await creerMagasinProtege() : new MagasinMemoire({}, () => undefined);
  document.documentElement.classList.remove(CLASSE_COFFRE_FERME);
  await chargerInterfaceHistorique(magasin);
}

function afficherEchecDemarrage(erreur: unknown): void {
  const message = erreur instanceof Error ? erreur.message : String(erreur);
  const alerte = document.createElement("p");
  alerte.setAttribute("role", "alert");
  alerte.textContent = `${NOM_APPLICATION} n'a pas pu démarrer : ${message}`;
  document.body.prepend(alerte);
}

demarrer().catch(afficherEchecDemarrage);
