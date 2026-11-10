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
import { MagasinMemoire } from "./domaine/magasin-memoire";
import { chargerInterfaceHistorique } from "./heritage/pont";

const NOM_APPLICATION = "DNMAX";

async function demarrer(): Promise<void> {
  // Rien n'est encore écrit sur le disque : les données ne vivent que le temps de la session.
  const magasin = new MagasinMemoire({}, () => undefined);
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
