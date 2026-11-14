// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Régénère les icônes de l'application dans src-tauri/icons/ à partir du dessin
 * de outils/icones.ts : chaque taille est rendue avec son niveau de détail, puis
 * assemblée en .ico (Windows) et .icns (macOS). Écrit aussi src-tauri/icone-source.svg.
 *
 * Usage : node outils/generer-icones.ts
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { assemblerIcns, assemblerIco, svgIcone, type ImageIcone } from "./icones.ts";

const DOSSIER = "src-tauri/icons";
const TAILLES_ICO = [16, 24, 32, 48, 64, 256];
const TAILLES_ICNS = [16, 32, 64, 128, 256, 512, 1024];

const navigateur = await chromium.launch();
try {
  const page = await navigateur.newPage();
  const rendre = async (taille: number): Promise<Uint8Array> => {
    await page.setViewportSize({ width: taille, height: taille });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svgIcone(taille)}`);
    return new Uint8Array(await page.locator("svg").screenshot({ omitBackground: true }));
  };
  const images = new Map<number, Uint8Array>();
  for (const taille of new Set([...TAILLES_ICO, ...TAILLES_ICNS, 128 * 2])) {
    images.set(taille, await rendre(taille));
  }
  const prendre = (taille: number): ImageIcone => ({ taille, png: images.get(taille) ?? new Uint8Array() });
  writeFileSync(`${DOSSIER}/32x32.png`, prendre(32).png);
  writeFileSync(`${DOSSIER}/128x128.png`, prendre(128).png);
  writeFileSync(`${DOSSIER}/128x128@2x.png`, prendre(256).png);
  writeFileSync(`${DOSSIER}/icon.png`, prendre(512).png);
  writeFileSync(`${DOSSIER}/icon.ico`, assemblerIco(TAILLES_ICO.map(prendre)));
  writeFileSync(`${DOSSIER}/icon.icns`, assemblerIcns(TAILLES_ICNS.map(prendre)));
  writeFileSync("src-tauri/icone-source.svg", `${svgIcone(1024)}\n`);
} finally {
  await navigateur.close();
}
