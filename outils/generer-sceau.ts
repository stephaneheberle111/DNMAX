// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Régénère public/documents/sceau-dn-made.png, le sceau des exports texte, à
 * partir de outils/sceau.ts, avec la police Bricolage Grotesque livrée par npm.
 * Une image plutôt qu'un dessin : Word et LibreOffice n'ont pas cette police.
 *
 * Usage : node outils/generer-sceau.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { svgSceau } from "./sceau.ts";

const COTE_PIXELS = 600;
const FICHIERS = "node_modules/@fontsource/bricolage-grotesque/files";
const police = (graisse: number): string =>
  `@font-face{font-family:Sceau;font-weight:${String(graisse)};src:url(data:font/woff2;base64,${readFileSync(
    `${FICHIERS}/bricolage-grotesque-latin-${String(graisse)}-normal.woff2`,
  ).toString("base64")}) format("woff2")}`;

const navigateur = await chromium.launch();
try {
  const page = await navigateur.newPage({ viewport: { width: COTE_PIXELS, height: COTE_PIXELS } });
  await page.setContent(
    `<style>${police(500)}${police(800)}html,body{margin:0;background:transparent}svg{display:block;width:${String(COTE_PIXELS)}px;height:${String(COTE_PIXELS)}px}</style>${svgSceau("Sceau")}`,
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  writeFileSync("public/documents/sceau-dn-made.png", await page.locator("svg").screenshot({ omitBackground: true }));
} finally {
  await navigateur.close();
}
