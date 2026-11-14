// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Petit sceau « DN MADE » de l'en-tête des exports texte : bord festonné, deux
 * filets, l'intitulé du diplôme en couronne, « DN » et « MADE » au centre.
 * Tout au trait noir. Calculs seuls.
 */

const CENTRE = 100;
const RAYON_FESTON = 97;
const FESTONS = 48;
const RAYON_ARC_FESTON = 7.87;

function point(angleDegres: number, rayon: number): string {
  const angle = (angleDegres * Math.PI) / 180;
  return `${(CENTRE + rayon * Math.cos(angle)).toFixed(2)} ${(CENTRE + rayon * Math.sin(angle)).toFixed(2)}`;
}

/** Bord festonné : un petit arc entre deux points voisins du cercle. */
export function cheminFeston(): string {
  const morceaux = [`M${point(-90, RAYON_FESTON)}`];
  for (let rang = 1; rang <= FESTONS; rang += 1) {
    const r = RAYON_ARC_FESTON.toFixed(2);
    morceaux.push(`A${r} ${r} 0 0 1 ${point(-90 + (360 * rang) / FESTONS, RAYON_FESTON)}`);
  }
  return `${morceaux.join(" ")} Z`;
}

const ENCRE = "#1C1A15";

/** SVG du sceau ; `police` est la famille déclarée pour Bricolage Grotesque. */
export function svgSceau(police: string): string {
  const gras = (texte: string): string => `<tspan font-weight="800">${texte}</tspan>`;
  const maigre = (texte: string): string => `<tspan font-weight="500">${texte}</tspan>`;
  const couronne =
    gras("D") + maigre("IPLÔME ") + gras("N") + maigre("ATIONAL DES ") + gras("M") + maigre("ÉTIERS D’") +
    gras("A") + maigre("RT ET DU ") + gras("DE") + maigre("SIGN ") + gras("·");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Sceau du diplôme : DN MADE">` +
    `<path d="${cheminFeston()}" fill="none" stroke="${ENCRE}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<circle cx="100" cy="100" r="89" fill="none" stroke="${ENCRE}" stroke-width="1.4"/>` +
    `<circle cx="100" cy="100" r="65" fill="none" stroke="${ENCRE}" stroke-width="1.4"/>` +
    `<path id="couronne" d="M100 172.5a72.5 72.5 0 1 1 0-145a72.5 72.5 0 1 1 0 145" fill="none"/>` +
    `<text font-family="${police}" font-size="13.2" fill="${ENCRE}" textLength="445.5" lengthAdjust="spacing">` +
    `<textPath href="#couronne" startOffset="5">${couronne}</textPath></text>` +
    `<text x="100" y="100" text-anchor="middle" font-family="${police}" font-weight="800" font-size="54" letter-spacing="-1" fill="${ENCRE}">DN</text>` +
    `<text x="100" y="131" text-anchor="middle" font-family="${police}" font-weight="800" font-size="30" letter-spacing="0.6" fill="${ENCRE}">MADE</text>` +
    `</svg>`
  );
}
