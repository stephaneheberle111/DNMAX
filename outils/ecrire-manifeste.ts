// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Écrit `latest.json` dans le dossier des fichiers construits.
 *
 * Usage : node outils/ecrire-manifeste.ts <dossier> <version> <adresse de téléchargement>
 * Les notes de version sont lues dans la variable d'environnement NOTES_VERSION.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { composerManifeste } from "./manifeste.ts";

const NOM_MANIFESTE = "latest.json";

const [dossier, version, adresse] = process.argv.slice(2);
if (dossier === undefined || version === undefined || adresse === undefined) {
  console.error("usage : node outils/ecrire-manifeste.ts <dossier> <version> <adresse de téléchargement>");
  process.exit(2);
}
const fichiers = readdirSync(dossier).map((nom) => ({
  nom,
  ...(nom.endsWith(".sig") ? { signature: readFileSync(join(dossier, nom), "utf8") } : {}),
}));
const manifeste = composerManifeste(version, process.env.NOTES_VERSION ?? "", new Date(), adresse, fichiers);
writeFileSync(join(dossier, NOM_MANIFESTE), `${JSON.stringify(manifeste, null, 2)}\n`);
console.log(`${NOM_MANIFESTE} écrit pour ${Object.keys(manifeste.platforms).join(", ")}`);
