// SPDX-License-Identifier: CECILL-2.1

/**
 * Échoue si `npm audit` signale autre chose que les alertes connues
 * (`ALERTES_ADMISES`). Le rapport est lu sur l'entrée standard.
 *
 * Usage : npm audit --omit=dev --json | node outils/verifier-audit-npm.ts
 */
import { readFileSync } from "node:fs";
import { alertesNonAdmises, lireAlertes } from "./audit-npm.ts";

const alertes = lireAlertes(readFileSync(0, "utf8"));
const nouvelles = alertesNonAdmises(alertes);
console.log(`${String(alertes.length)} alerte(s), dont ${String(alertes.length - nouvelles.length)} connue(s) et acceptée(s).`);
for (const alerte of nouvelles) {
  console.error(`::error::${alerte.paquet} : ${alerte.identifiant} (${alerte.gravite}) — ${alerte.titre}`);
}
process.exit(nouvelles.length === 0 ? 0 : 1);
