// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Écrit sur la sortie standard la section du journal des modifications d'une
 * version, sans son titre : elle devient les notes de `latest.json`, que
 * l'application classe par type de changement dans l'annonce de mise à jour.
 *
 * Usage : node outils/notes-version.ts <version> [journal]
 * Échoue si la version n'a pas de section : une version publiée doit être décrite.
 */
import { readFileSync } from "node:fs";
import { sectionVersion } from "../src/domaine/nouveautes.ts";

const [version, chemin = "CHANGELOG.md"] = process.argv.slice(2);
if (version === undefined || version === "") {
  console.error("Usage : node outils/notes-version.ts <version> [journal]");
  process.exit(2);
}
const section = sectionVersion(readFileSync(chemin, "utf8"), version);
if (section === "") {
  console.error(`Aucune section « ${version} » dans ${chemin}.`);
  process.exit(1);
}
process.stdout.write(`${section}\n`);
