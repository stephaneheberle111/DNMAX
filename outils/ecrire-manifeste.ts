// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Écrit `latest.json` dans le dossier des fichiers construits.
 *
 * Usage : node outils/ecrire-manifeste.ts <dossier> <version> <adresse de téléchargement> [systèmes] [manifeste publié]
 * - systèmes : liste séparée par des virgules (windows,linux,macos par défaut) ;
 * - manifeste publié : le `latest.json` déjà en ligne, que l'on complète au lieu de le remplacer.
 * Les notes de version sont lues dans la variable d'environnement NOTES_VERSION.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { completerManifeste, composerManifeste, lireManifeste, lireSystemes, SYSTEMES } from "./manifeste.ts";

const NOM_MANIFESTE = "latest.json";

const [dossier, version, adresse, systemes, publie] = process.argv.slice(2);
if (dossier === undefined || version === undefined || adresse === undefined) {
  console.error("usage : node outils/ecrire-manifeste.ts <dossier> <version> <adresse de téléchargement> [systèmes] [manifeste publié]");
  process.exit(2);
}
const fichiers = readdirSync(dossier)
  .filter((nom) => nom !== NOM_MANIFESTE)
  .map((nom) => ({
    nom,
    ...(nom.endsWith(".sig") ? { signature: readFileSync(join(dossier, nom), "utf8") } : {}),
  }));
const nouveau = composerManifeste(
  version,
  process.env.NOTES_VERSION ?? "",
  new Date(),
  adresse,
  fichiers,
  systemes === undefined || systemes === "" ? SYSTEMES : lireSystemes(systemes),
);
let manifeste = nouveau;
if (publie !== undefined) {
  const existant = lireManifeste(readFileSync(publie, "utf8"));
  if (existant === null) {
    console.error(`${publie} n'est pas un manifeste de mise à jour lisible`);
    process.exit(1);
  }
  manifeste = completerManifeste(existant, nouveau);
}
writeFileSync(join(dossier, NOM_MANIFESTE), `${JSON.stringify(manifeste, null, 2)}\n`);
console.log(`${NOM_MANIFESTE} écrit pour ${Object.keys(manifeste.platforms).join(", ")}`);
