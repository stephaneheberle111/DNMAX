// SPDX-License-Identifier: CECILL-2.1

/**
 * Régénère les images de l'installeur Windows dans src-tauri/windows/habillage/,
 * à partir du dessin de outils/habillage-installeur.ts : le logotype en deux
 * tailles et le pavé du bouton principal, à chaque échelle d'affichage, ainsi que
 * les polices du site, converties des fichiers de @fontsource.
 *
 * Usage : node outils/generer-habillage-installeur.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import {
  COULEURS_INSTALLEUR,
  ECHELLES_INSTALLEUR,
  POLICES_INSTALLEUR,
  coteALEchelle,
  encoderBmp,
  imagesInstalleur,
  woffVersSfnt,
} from "./habillage-installeur.ts";

const DOSSIER = "src-tauri/windows/habillage";

mkdirSync(DOSSIER, { recursive: true });
for (const police of POLICES_INSTALLEUR) {
  writeFileSync(`${DOSSIER}/${police.nom}.ttf`, woffVersSfnt(new Uint8Array(readFileSync(`node_modules/${police.source}`))));
}
const navigateur = await chromium.launch();
try {
  const page = await navigateur.newPage();
  for (const echelle of ECHELLES_INSTALLEUR) {
    for (const image of imagesInstalleur(echelle)) {
      const largeur = coteALEchelle(image.largeur, echelle);
      const hauteur = coteALEchelle(image.hauteur, echelle);
      // Le canevas du navigateur rend les pixels bruts, que le .bmp range ensuite à sa façon.
      const pixels = await page.evaluate(
        async ({ svg, largeur, hauteur, fond }) => {
          const dessin = new Image();
          dessin.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
          await dessin.decode();
          const canevas = document.createElement("canvas");
          canevas.width = largeur;
          canevas.height = hauteur;
          const contexte = canevas.getContext("2d");
          if (!contexte) throw new Error("Canevas indisponible");
          // Fond uni d'abord : un bord resté transparent deviendrait noir dans le .bmp.
          contexte.fillStyle = fond;
          contexte.fillRect(0, 0, largeur, hauteur);
          contexte.drawImage(dessin, 0, 0, largeur, hauteur);
          return Array.from(contexte.getImageData(0, 0, largeur, hauteur).data);
        },
        { svg: image.svg(largeur, hauteur), largeur, hauteur, fond: COULEURS_INSTALLEUR.fond },
      );
      writeFileSync(`${DOSSIER}/${image.nom}-${String(echelle)}.bmp`, encoderBmp(largeur, hauteur, Uint8Array.from(pixels)));
    }
  }
} finally {
  await navigateur.close();
}
