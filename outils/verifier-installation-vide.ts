// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Démarre l'interface telle qu'elle est livrée, dans un navigateur sans
 * aucune donnée, et vérifie qu'elle ne contient rien d'autre qu'une
 * installation vierge (voir `installation-vide.ts`). Sort en erreur sinon.
 *
 * Usage : node outils/verifier-installation-vide.ts
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { ecartsInstallationVide } from "./installation-vide.ts";

const serveur = await createServer({ server: { port: 0, strictPort: false }, logLevel: "error" });
await serveur.listen();
const adresse = serveur.resolvedUrls?.local[0];
const navigateur = await chromium.launch();
let code = 0;
try {
  if (adresse === undefined) {
    throw new Error("le serveur de développement n'a pas d'adresse");
  }
  const page = await navigateur.newPage();
  const erreurs: string[] = [];
  page.on("pageerror", (erreur) => erreurs.push(String(erreur)));
  await page.goto(adresse);
  await page.waitForFunction(() => window.dnmaxPont?.stockage !== undefined, undefined, { timeout: 20000 });
  // Laisse l'interface finir ses écritures de démarrage.
  await page.waitForTimeout(1000);
  // Hors de l'enveloppe, le stockage est un magasin en mémoire, qui sait lister ses entrées.
  const entrees = await page.evaluate(() => {
    const stockage = window.dnmaxPont?.stockage as unknown as { entrees(): Record<string, string> } | undefined;
    return stockage?.entrees() ?? {};
  });
  const ecarts = [...ecartsInstallationVide(entrees), ...erreurs.map((erreur) => `erreur de page : ${erreur}`)];
  if (ecarts.length > 0) {
    console.error(`L'installation livrée n'est pas vierge :\n- ${ecarts.join("\n- ")}`);
    code = 1;
  } else {
    console.log("Installation livrée vierge : aucune donnée au démarrage.");
  }
} finally {
  await navigateur.close();
  await serveur.close();
}
process.exit(code);
