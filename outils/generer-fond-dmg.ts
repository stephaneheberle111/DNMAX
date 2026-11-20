// SPDX-License-Identifier: CECILL-2.1

/**
 * Régénère le fond de la fenêtre d'installation sous macOS,
 * src-tauri/macos/fond-dmg.png, à partir du dessin de outils/fond-dmg.ts.
 *
 * Usage : node outils/generer-fond-dmg.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { DENSITE_DMG, FENETRE_DMG, inscrireDensitePng, pageFondDmg } from "./fond-dmg.ts";

const DOSSIER = "src-tauri/macos";
const POLICE = "node_modules/@fontsource/public-sans/files/public-sans-latin-400-normal.woff2";

mkdirSync(DOSSIER, { recursive: true });
const navigateur = await chromium.launch();
try {
  const page = await navigateur.newPage({
    viewport: { width: FENETRE_DMG.largeur, height: FENETRE_DMG.hauteur },
    deviceScaleFactor: DENSITE_DMG,
  });
  await page.setContent(pageFondDmg(readFileSync(POLICE).toString("base64")));
  await page.evaluate(() => document.fonts.ready);
  const png = new Uint8Array(await page.screenshot());
  writeFileSync(`${DOSSIER}/fond-dmg.png`, inscrireDensitePng(png, DENSITE_DMG));
} finally {
  await navigateur.close();
}
