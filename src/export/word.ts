// SPDX-License-Identifier: CECILL-2.1
/**
 * Export Word (.docx, OOXML minimal) d'une évaluation : une fiche vierge, ou
 * une fiche par étudiant. Le XML est écrit à la main, sans bibliothèque de
 * traitement de texte, pour rester léger et lisible par Word et LibreOffice.
 */
import JSZip from "jszip";
import { bornesNiveaux } from "../domaine/saisie-resultats";
import { dispositionLibellesNiveaux } from "../domaine/jauge-export";
import {
  appreciationDe,
  echapperXml as X,
  ImagesDocument,
  observationDe,
  pourcentageDe,
  type DessinJauge,
  type EtudiantExport,
  type FicheExport,
} from "./modele";

/** Largeur utile d'une page A4 portrait, marges de 1,2 cm, en vingtièmes de point. */
const LARGEUR_PAGE = 10500;
/** Taille du sceau en tête des fiches. */
export const SCEAU_PX = 72;
const EMU_PAR_PX = 9525;
/** Largeur réservée au sceau dans l'en-tête, en vingtièmes de point. */
export const SCEAU_LARGEUR = 1500;
const CONSIGNE_JAUGE =
  "Niveau d'acquisition : griser la jauge de gauche à droite jusqu'au point atteint, en suivant les niveaux indiqués au-dessus ; dans la zone du premier niveau, ne rien griser, dans celle du dernier, griser jusqu'au bout.";

interface OptionsParagraphe {
  b?: boolean;
  i?: boolean;
  sz?: number;
  color?: string;
  caps?: boolean;
  mono?: boolean;
  align?: string;
  before?: number;
  after?: number;
  border?: boolean;
}

function paragraphe(texte: string, o: OptionsParagraphe = {}): string {
  const rpr =
    `<w:rPr>${o.b === true ? "<w:b/>" : ""}${o.i === true ? "<w:i/>" : ""}` +
    (o.sz === undefined ? "" : `<w:sz w:val="${String(o.sz * 2)}"/><w:szCs w:val="${String(o.sz * 2)}"/>`) +
    `${o.color === undefined ? "" : `<w:color w:val="${o.color}"/>`}${o.caps === true ? "<w:caps/>" : ""}` +
    `${o.mono === true ? `<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>` : ""}</w:rPr>`;
  const ppr =
    `<w:pPr>${o.align === undefined ? "" : `<w:jc w:val="${o.align}"/>`}<w:spacing w:before="${String(o.before ?? 0)}" w:after="${String(o.after ?? 60)}" w:line="240" w:lineRule="auto"/>` +
    `${o.border === true ? `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="D6CDB9"/></w:pBdr>` : ""}</w:pPr>`;
  const runs = texte
    .split("\n")
    .map((ligne, rang) => `${rang > 0 ? "<w:r><w:br/></w:r>" : ""}<w:r>${rpr}<w:t xml:space="preserve">${X(ligne)}</w:t></w:r>`)
    .join("");
  return `<w:p>${ppr}${runs}</w:p>`;
}

function cellule(contenu: string, o: { w?: number; shd?: string; span?: number; v?: string } = {}): string {
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${String(o.w ?? 1000)}" w:type="dxa"/>${o.shd === undefined ? "" : `<w:shd w:val="clear" w:fill="${o.shd}"/>`}` +
    `${o.span === undefined ? "" : `<w:gridSpan w:val="${String(o.span)}"/>`}<w:vAlign w:val="${o.v ?? "top"}"/></w:tcPr>${contenu}</w:tc>`
  );
}

function rangee(cellules: string, entete = false): string {
  return `<w:tr>${entete ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${cellules}</w:tr>`;
}

function tableau(rangees: string, largeurs: readonly number[]): string {
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>` +
    ["top", "left", "bottom", "right", "insideH", "insideV"].map((cote) => `<w:${cote} w:val="single" w:sz="6" w:space="0" w:color="C4BAA3"/>`).join("") +
    `</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
    `<w:tblGrid>${largeurs.map((largeur) => `<w:gridCol w:w="${String(largeur)}"/>`).join("")}</w:tblGrid>${rangees}</w:tbl>`
  );
}

/** Un dessin (image) en ligne, d'identifiant suivant dans le document. */
function dessinEnLigne(
  images: ImagesDocument,
  image: { rid: string; fichier: string },
  cx: number,
  cy: number,
  nom: string,
  paragrapheOuvrant: string,
): string {
  images.dessins += 1;
  const id = String(1000 + images.dessins);
  return (
    `${paragrapheOuvrant}<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${String(cx)}" cy="${String(cy)}"/><wp:docPr id="${id}" name="${nom} ${id}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="${id}" name="${image.fichier}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${image.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${String(cx)}" cy="${String(cy)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
  );
}

/** En-tête avec sceau : le contenu de l'en-tête à gauche, le sceau à droite, sans bordure. */
function avecSceau(images: ImagesDocument, entete: string, sceau: string): string {
  const sansBordure = ["top", "left", "bottom", "right", "insideH", "insideV"].map((cote) => `<w:${cote} w:val="nil"/>`).join("");
  const image = images.image("sceau", () => sceau);
  const cote = Math.round(SCEAU_PX * EMU_PAR_PX);
  const dessin = dessinEnLigne(images, image, cote, cote, "Image", `<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="0" w:after="0"/></w:pPr>`);
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${String(LARGEUR_PAGE)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${sansBordure}</w:tblBorders>` +
    `<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${String(LARGEUR_PAGE - SCEAU_LARGEUR)}"/><w:gridCol w:w="${String(SCEAU_LARGEUR)}"/></w:tblGrid>` +
    `<w:tr>${cellule(entete, { w: LARGEUR_PAGE - SCEAU_LARGEUR, v: "top" })}${cellule(dessin, { w: SCEAU_LARGEUR, v: "top" })}</w:tr></w:tbl>`
  );
}

/** Noms des niveaux au-dessus de la colonne des jauges : chacun a la place de son mot le plus long. */
function libellesJauge(niveaux: readonly string[], largeur: number): string {
  const { taille, largeurs } = dispositionLibellesNiveaux(niveaux, bornesNiveaux(niveaux.length), largeur - 200);
  const cellules = niveaux.map(
    (nom, rang) =>
      `<w:tc><w:tcPr><w:tcW w:w="${String(largeurs[rang] ?? 0)}" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>${paragraphe(nom, { sz: taille, align: "center", after: 0, color: "5A5345" })}</w:tc>`,
  );
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${String(largeurs.reduce((a, b) => a + b, 0))}" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblBorders>` +
    ["top", "bottom", "right", "left", "insideV", "insideH"].map((cote) => `<w:${cote} w:val="nil"/>`).join("") +
    `</w:tblBorders><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
    `<w:tblGrid>${largeurs.map((x) => `<w:gridCol w:w="${String(x)}"/>`).join("")}</w:tblGrid><w:tr>${cellules.join("")}</w:tr></w:tbl>` +
    paragraphe("", { after: 0, sz: 2 })
  );
}

/**
 * Image d'une jauge, partagée entre les lignes qui ont la même valeur et la
 * même largeur. Rend aussi l'image, pour l'export OpenDocument qui la réutilise.
 */
export function imageJauge(
  images: ImagesDocument,
  dessiner: DessinJauge,
  pourcentage: number | null,
  largeur: number,
): { rid: string; fichier: string } {
  const largeurUtile = largeur - 200;
  return images.image(`${pourcentage === null ? "v" : `p${String(pourcentage)}`}_${String(largeurUtile)}`, () => {
    const largeurPx = Math.round(largeurUtile / 8);
    const hauteurPx = Math.max(10, Math.round((largeurPx * 280) / largeurUtile));
    return dessiner(pourcentage, largeurPx, hauteurPx);
  });
}

function jauge(images: ImagesDocument, dessiner: DessinJauge, pourcentage: number | null, largeur: number): string {
  const largeurUtile = largeur - 200;
  const image = imageJauge(images, dessiner, pourcentage, largeur);
  return dessinEnLigne(
    images,
    image,
    largeurUtile * 635,
    280 * 635,
    "Jauge",
    `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="40"/></w:pPr>`,
  );
}

function ficheXml(fiche: FicheExport, etudiant: EtudiantExport | null, images: ImagesDocument, dessiner: DessinJauge): string {
  const { colonnes, lignes, niveaux } = fiche;
  const resultat = etudiant === null ? null : (etudiant.resultat ?? { n: {}, obs: {}, appr: "" });
  const somme = colonnes.reduce((total, colonne) => total + colonne.largeur, 0);
  const largeurs = colonnes.map((colonne) => Math.round((LARGEUR_PAGE * colonne.largeur) / somme));
  let entete = "";
  entete += paragraphe(fiche.diplome, { sz: 8.5, caps: true, color: "5A5345", after: 20 });
  entete += paragraphe(fiche.titre || "Évaluation", { b: true, sz: 16, after: 40 });
  if (fiche.signature !== "") entete += paragraphe(fiche.signature, { sz: 10, after: 30 });
  entete += paragraphe(fiche.contexte, { sz: 10, color: "10555F", after: 40, border: true });
  if (etudiant !== null && etudiant.nom !== "") entete += paragraphe(`Étudiant : ${etudiant.nom}`, { sz: 10, after: 120 });
  let xml = fiche.sceau === null ? entete : avecSceau(images, entete, fiche.sceau) + paragraphe("", { after: 60 });
  if (fiche.consignes !== "") {
    xml += paragraphe("Consignes et attendus", { b: true, sz: 10, caps: true, color: "5A5345", before: 120, after: 30 });
    xml += paragraphe(fiche.consignes, { sz: 10, after: 120 });
  }
  xml += paragraphe("Compétences évaluées", { b: true, sz: 10, caps: true, color: "5A5345", before: 120, after: 20 });
  xml += paragraphe(CONSIGNE_JAUGE, { sz: 8.5, i: true, color: "5A5345", after: 60 });
  let rangees = rangee(
    colonnes
      .map((colonne, rang) =>
        cellule(
          paragraphe(colonne.titre, { b: true, sz: 8.5, caps: true, after: colonne.niveau ? 30 : 0, align: colonne.niveau ? "center" : "left" }) +
            (colonne.niveau ? libellesJauge(niveaux, largeurs[rang] ?? 0) : ""),
          { w: largeurs[rang] ?? 0, shd: "F1ECE0" },
        ),
      )
      .join(""),
    true,
  );
  if (lignes.length === 0) {
    rangees += rangee(cellule(paragraphe("Aucune compétence sélectionnée.", { sz: 10, i: true, after: 0 }), { w: LARGEUR_PAGE, span: colonnes.length }));
  }
  for (const ligne of lignes) {
    rangees += rangee(
      colonnes
        .map((colonne, rang) => {
          const largeur = largeurs[rang] ?? 0;
          if (colonne.niveau) {
            const pourcentage = resultat === null ? null : pourcentageDe(resultat, ligne.cle, niveaux.length);
            return cellule(jauge(images, dessiner, pourcentage, largeur), { w: largeur, v: "center" });
          }
          if (colonne.cle === "code") return cellule(paragraphe(ligne.code, { mono: true, sz: 9, b: true, after: 0 }), { w: largeur });
          if (colonne.cle === "bloc") return cellule(paragraphe(String(ligne.bloc), { mono: true, sz: 9, align: "center", after: 0 }), { w: largeur });
          if (colonne.cle === "lib") return cellule(paragraphe(ligne.lib, { sz: 9, b: ligne.op, after: 0 }), { w: largeur });
          if (colonne.cle === "obs") {
            const observation = resultat === null ? "" : observationDe(resultat, ligne.cle);
            return cellule(
              observation === "" ? paragraphe("", { after: 0 }) + paragraphe("", { after: 0 }) : paragraphe(observation, { sz: 9, after: 0 }),
              { w: largeur },
            );
          }
          const valeur = (ligne as unknown as Record<string, unknown>)[colonne.cle];
          return cellule(paragraphe(typeof valeur === "string" ? valeur : "", { sz: 9, after: 0 }), { w: largeur });
        })
        .join(""),
    );
  }
  xml += tableau(rangees, largeurs);
  xml += paragraphe("Appréciation générale", { b: true, sz: 10, caps: true, color: "5A5345", before: 200, after: 40 });
  const appreciation = resultat === null ? "" : appreciationDe(resultat);
  xml += tableau(
    rangee(
      cellule(
        appreciation === ""
          ? paragraphe("", { after: 0 }) + paragraphe("", { after: 0 }) + paragraphe("", { after: 0 }) + paragraphe("", { after: 0 })
          : paragraphe(appreciation, { sz: 10, after: 0 }),
        { w: LARGEUR_PAGE },
      ),
    ),
    [LARGEUR_PAGE],
  );
  return xml;
}

/** Document Word complet, en octets. */
export async function construireDocx(fiche: FicheExport, dessiner: DessinJauge): Promise<Uint8Array> {
  const images = new ImagesDocument();
  const section = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="680" w:right="680" w:bottom="680" w:left="680" w:header="340" w:footer="340" w:gutter="0"/></w:sectPr>`;
  const parties = fiche.etudiants.length > 0 ? fiche.etudiants.map((etudiant) => ficheXml(fiche, etudiant, images, dessiner)) : [ficheXml(fiche, null, images, dessiner)];
  const corps = parties.map((partie, rang) => (rang < parties.length - 1 ? `${partie}<w:p><w:r><w:br w:type="page"/></w:r></w:p>` : partie)).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${corps}${section}</w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="fr-FR"/>
</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const relations = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const relationsDocument = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${images.liste
    .map(
      (image) =>
        `<Relationship Id="${image.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.fichier}"/>`,
    )
    .join("")}</Relationships>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", types);
  zip.folder("_rels")?.file(".rels", relations);
  const word = zip.folder("word");
  word?.file("document.xml", document);
  word?.file("styles.xml", styles);
  word?.folder("_rels")?.file("document.xml.rels", relationsDocument);
  const medias = word?.folder("media");
  for (const image of images.liste) medias?.file(image.fichier, image.donnees, { base64: true });
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
