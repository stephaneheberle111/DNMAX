// SPDX-License-Identifier: CECILL-2.1

/**
 * Écrit dans le dossier des téléchargements le manifeste de mise à jour servi
 * par dnmax.fr (voir `relocaliserManifeste`).
 *
 * Usage : node outils/manifeste-ovh.ts <latest.json publié sur GitHub> <dossier des téléchargements> <adresse sur dnmax.fr>
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lireManifeste, relocaliserManifeste } from "./manifeste.ts";

const [publie, dossier, adresse] = process.argv.slice(2);
if (publie === undefined || dossier === undefined || adresse === undefined) {
  console.error("usage : node outils/manifeste-ovh.ts <latest.json> <dossier> <adresse>");
  process.exit(2);
}
const manifeste = lireManifeste(readFileSync(publie, "utf8"));
if (manifeste === null) {
  console.error(`${publie} n'est pas un manifeste de mise à jour lisible`);
  process.exit(1);
}
// L'installeur Windows déposé (copie du « -setup.exe » signé) sert aussi de fichier de mise à jour.
const INSTALLEUR_WINDOWS = "DNMAX-windows.exe";
const deposes: Record<string, string> = existsSync(join(dossier, INSTALLEUR_WINDOWS)) ? { "windows-x86_64": INSTALLEUR_WINDOWS } : {};
const relocalise = relocaliserManifeste(manifeste, adresse, deposes);
writeFileSync(join(dossier, "latest.json"), `${JSON.stringify(relocalise, null, 2)}\n`);
for (const [plateforme, { url }] of Object.entries(relocalise.platforms)) {
  console.log(`${plateforme} : ${url}`);
}
