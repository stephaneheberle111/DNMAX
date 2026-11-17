// SPDX-License-Identifier: CECILL-2.1
import { bornesNiveaux, niveauDuPourcentage } from "../domaine/saisie-resultats";
import { couleurNiveau } from "../domaine/teintes-niveaux";
import type { DessinJauge } from "./modele";

/**
 * Image de la jauge des exports Word et OpenDocument : piste arrondie,
 * remplie jusqu'au niveau atteint, avec un séparateur discret entre niveaux
 * pour situer l'étudiant d'une jauge à l'autre. Dessinée dans un canevas.
 */
export function dessinateurJauge(nombreNiveaux: number): DessinJauge {
  return (pourcentage, largeur, hauteur) => {
    const echelle = 3;
    const canevas = document.createElement("canvas");
    canevas.width = largeur * echelle;
    canevas.height = hauteur * echelle;
    const dessin = canevas.getContext("2d");
    if (dessin === null) throw new Error("dessin de la jauge impossible");
    dessin.scale(echelle, echelle);
    const rayon = hauteur / 2;
    const rectangleArrondi = (x: number, y: number, l: number, h: number, r: number): void => {
      dessin.beginPath();
      dessin.moveTo(x + r, y);
      dessin.arcTo(x + l, y, x + l, y + h, r);
      dessin.arcTo(x + l, y + h, x, y + h, r);
      dessin.arcTo(x, y + h, x, y, r);
      dessin.arcTo(x, y, x + l, y, r);
      dessin.closePath();
    };
    rectangleArrondi(0.75, 0.75, largeur - 1.5, hauteur - 1.5, rayon - 0.75);
    dessin.fillStyle = "#FFFFFF";
    dessin.fill();
    if (pourcentage !== null) {
      const rempli = pourcentage === 0 ? Math.max(hauteur, 7) : Math.max(hauteur, ((largeur - 1.5) * pourcentage) / 100);
      dessin.save();
      rectangleArrondi(0.75, 0.75, largeur - 1.5, hauteur - 1.5, rayon - 0.75);
      dessin.clip();
      rectangleArrondi(0.75, 0.75, rempli, hauteur - 1.5, rayon - 0.75);
      dessin.fillStyle = couleurNiveau(niveauDuPourcentage(pourcentage, nombreNiveaux), nombreNiveaux);
      dessin.fill();
      dessin.restore();
    }
    for (const borne of bornesNiveaux(nombreNiveaux).slice(1, -1)) {
      const x = 0.75 + ((largeur - 1.5) * borne) / 100;
      dessin.beginPath();
      dessin.moveTo(x, 2.5);
      dessin.lineTo(x, hauteur - 2.5);
      dessin.lineWidth = 0.8;
      dessin.strokeStyle = pourcentage !== null && pourcentage > borne ? "rgba(255,255,255,.85)" : "#D6CDB9";
      dessin.stroke();
    }
    rectangleArrondi(0.75, 0.75, largeur - 1.5, hauteur - 1.5, rayon - 0.75);
    dessin.lineWidth = 1.2;
    dessin.strokeStyle = "#8C8270";
    dessin.stroke();
    return canevas.toDataURL("image/png").split(",")[1] ?? "";
  };
}
