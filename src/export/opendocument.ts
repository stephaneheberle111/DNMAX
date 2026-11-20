// SPDX-License-Identifier: CECILL-2.1
/**
 * Export OpenDocument texte (.odt, LibreOffice et OpenOffice) d'une
 * évaluation : mêmes fiches que l'export Word, mêmes images de jauge.
 */
import JSZip from "jszip";
import { bornesNiveaux } from "../domaine/saisie-resultats";
import { dispositionLibellesNiveaux, TAILLES_LIBELLES } from "../domaine/jauge-export";
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
import { imageJauge, SCEAU_LARGEUR, SCEAU_PX } from "./word";

const LARGEUR_PAGE = 10500;
const CONSIGNE_JAUGE =
  "Niveau de maîtrise : griser la jauge de gauche à droite jusqu'au point atteint, en suivant les niveaux indiqués au-dessus ; dans la zone du premier niveau, ne rien griser, dans celle du dernier, griser jusqu'au bout.";

/** Vingtièmes de point en centimètres. */
function cm(vingtiemes: number): string {
  return `${(vingtiemes / 567).toFixed(3)}cm`;
}

function texte(contenu: string, style = "P"): string {
  return `<text:p text:style-name="${style}">${contenu
    .split("\n")
    .map(X)
    .join("<text:line-break/>")}</text:p>`;
}

function cellule(contenu: string, style = "Cell"): string {
  return `<table:table-cell table:style-name="${style}" office:value-type="string">${contenu || "<text:p/>"}</table:table-cell>`;
}

function rangee(cellules: string, entete = false): string {
  return entete
    ? `<table:table-header-rows><table:table-row>${cellules}</table:table-row></table:table-header-rows>`
    : `<table:table-row>${cellules}</table:table-row>`;
}

/** Construction d'un document : numérotation des tableaux et des cadres, styles des colonnes. */
class Redaction {
  numero = 0;
  readonly stylesColonnes: string[] = [];
  readonly images = new ImagesDocument();

  constructor(private readonly dessiner: DessinJauge) {}

  /** Le numéro est pris après que le contenu a été construit, comme dans l'export d'origine. */
  tableau(largeurs: readonly number[], rangees: string, alignement?: "center"): string {
    this.numero += 1;
    const n = String(this.numero);
    largeurs.forEach((largeur, rang) => {
      this.stylesColonnes.push(
        `<style:style style:name="T${n}C${String(rang)}" style:family="table-column"><style:table-column-properties style:column-width="${cm(largeur)}"/></style:style>`,
      );
    });
    this.stylesColonnes.push(
      `<style:style style:name="T${n}" style:family="table"><style:table-properties style:width="${cm(largeurs.reduce((a, b) => a + b, 0))}" table:align="${alignement === "center" ? "center" : "left"}" fo:margin-top="0cm" fo:margin-bottom="0cm"/></style:style>`,
    );
    return `<table:table table:name="Tableau${n}" table:style-name="T${n}">${largeurs.map((_, rang) => `<table:table-column table:style-name="T${n}C${String(rang)}"/>`).join("")}${rangees}</table:table>`;
  }

  jauge(pourcentage: number | null, largeur: number): string {
    const image = imageJauge(this.images, this.dessiner, pourcentage, largeur);
    this.images.dessins += 1;
    this.numero += 1;
    return `<text:p text:style-name="Pc"><draw:frame draw:name="j${String(this.numero)}" text:anchor-type="as-char" svg:width="${cm(largeur - 200)}" svg:height="${cm(280)}" draw:z-index="0"><draw:image xlink:href="Pictures/${image.fichier}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`;
  }

  libellesJauge(niveaux: readonly string[], largeur: number): string {
    const { taille, largeurs } = dispositionLibellesNiveaux(niveaux, bornesNiveaux(niveaux.length), largeur - 200);
    const cellules = niveaux.map((nom) => cellule(texte(nom, `Pg${String(taille).replace(".", "_")}`), "CellN")).join("");
    return this.tableau(largeurs, rangee(cellules), "center");
  }

  avecSceau(entete: string, sceau: string): string {
    const image = this.images.image("sceau", () => sceau);
    this.numero += 1;
    const cote = `${((SCEAU_PX * 2.54) / 96).toFixed(3)}cm`;
    const dessin = `<text:p text:style-name="PcD"><draw:frame draw:name="i${String(this.numero)}" text:anchor-type="as-char" svg:width="${cote}" svg:height="${cote}" draw:z-index="0"><draw:image xlink:href="Pictures/${image.fichier}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`;
    return this.tableau([LARGEUR_PAGE - SCEAU_LARGEUR, SCEAU_LARGEUR], rangee(cellule(entete, "CellE") + cellule(dessin, "CellE")));
  }

  fiche(fiche: FicheExport, etudiant: EtudiantExport | null): string {
    const { colonnes, lignes, niveaux } = fiche;
    const resultat = etudiant === null ? null : (etudiant.resultat ?? { n: {}, obs: {}, appr: "" });
    const somme = colonnes.reduce((total, colonne) => total + colonne.largeur, 0);
    const largeurs = colonnes.map((colonne) => Math.round((LARGEUR_PAGE * colonne.largeur) / somme));
    let entete =
      texte(fiche.diplome, "Pk") +
      texte(fiche.titre || "Évaluation", "Ph") +
      (fiche.signature === "" ? "" : texte(fiche.signature)) +
      texte(fiche.contexte, "Pa");
    if (etudiant !== null && etudiant.nom !== "") entete += texte(`Étudiant·e : ${etudiant.nom}`);
    let xml = fiche.sceau === null ? entete : this.avecSceau(entete, fiche.sceau);
    if (fiche.consignes !== "") xml += texte("Consignes et attendus", "Ps") + texte(fiche.consignes);
    xml += texte("Compétences évaluées", "Ps") + texte(CONSIGNE_JAUGE, "Pi");
    let rangees = rangee(
      colonnes
        .map((colonne, rang) =>
          cellule(texte(colonne.titre, colonne.niveau ? "PhC" : "PhT") + (colonne.niveau ? this.libellesJauge(niveaux, largeurs[rang] ?? 0) : ""), "CellH"),
        )
        .join(""),
      true,
    );
    if (lignes.length === 0) {
      rangees += rangee(
        `<table:table-cell table:style-name="Cell" table:number-columns-spanned="${String(colonnes.length)}" office:value-type="string">${texte("Aucune compétence sélectionnée.", "Pi")}</table:table-cell>` +
          colonnes
            .slice(1)
            .map(() => "<table:covered-table-cell/>")
            .join(""),
      );
    }
    for (const ligne of lignes) {
      rangees += rangee(
        colonnes
          .map((colonne, rang) => {
            if (colonne.niveau) {
              return cellule(this.jauge(resultat === null ? null : pourcentageDe(resultat, ligne.cle, niveaux.length), largeurs[rang] ?? 0), "CellM");
            }
            if (colonne.cle === "lib") return cellule(texte(ligne.lib, ligne.op ? "Pb" : "P9"));
            if (colonne.cle === "obs") return cellule(texte(resultat === null ? "" : observationDe(resultat, ligne.cle), "P9"));
            const valeur = (ligne as unknown as Record<string, unknown>)[colonne.cle];
            return cellule(texte(typeof valeur === "string" ? valeur : "", "P9"));
          })
          .join(""),
      );
    }
    xml += this.tableau(largeurs, rangees);
    xml += texte("Appréciation générale", "Ps");
    const appreciation = resultat === null ? "" : appreciationDe(resultat);
    xml += this.tableau([LARGEUR_PAGE], rangee(cellule(appreciation === "" ? texte("") + texte("") + texte("") + texte("") : texte(appreciation))));
    return xml;
  }
}

const ESPACES_DE_NOMS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.3"`;

function styleParagraphe(nom: string, paragraphe?: string, caracteres?: string): string {
  return `<style:style style:name="${nom}" style:family="paragraph"><style:paragraph-properties ${paragraphe || 'fo:margin-top="0cm" fo:margin-bottom="0.05cm"'}/><style:text-properties ${caracteres ?? ""}/></style:style>`;
}

function styleCellule(nom: string, fond?: string, alignement?: string): string {
  return `<style:style style:name="${nom}" style:family="table-cell"><style:table-cell-properties fo:padding="0.08cm" fo:border="0.5pt solid #C4BAA3" ${fond === undefined ? "" : `fo:background-color="${fond}"`} style:vertical-align="${alignement ?? "top"}"/></style:style>`;
}

/** Document OpenDocument texte complet, en octets. */
export async function construireOdt(fiche: FicheExport, dessiner: DessinJauge): Promise<Uint8Array> {
  const redaction = new Redaction(dessiner);
  const parties = fiche.etudiants.length > 0 ? fiche.etudiants.map((etudiant) => redaction.fiche(fiche, etudiant)) : [redaction.fiche(fiche, null)];
  const corps = parties.map((partie, rang) => (rang > 0 ? `<text:p text:style-name="PB"/>${partie}` : partie)).join("");
  const automatiques =
    styleParagraphe("P", "", 'fo:font-size="10pt"') +
    styleParagraphe("P9", "", 'fo:font-size="9pt"') +
    styleParagraphe("Pb", "", 'fo:font-size="9pt" fo:font-weight="bold"') +
    styleParagraphe("Pk", "", 'fo:font-size="8pt" fo:font-weight="bold" fo:color="#5A5345" fo:text-transform="uppercase"') +
    styleParagraphe("Ph", 'fo:margin-top="0.05cm" fo:margin-bottom="0.1cm"', 'fo:font-size="16pt" fo:font-weight="bold"') +
    styleParagraphe("Pa", 'fo:margin-bottom="0.25cm" fo:border-bottom="0.5pt solid #D6CDB9" fo:padding-bottom="0.05cm"', 'fo:font-size="10pt" fo:color="#10555F"') +
    styleParagraphe("Ps", 'fo:margin-top="0.3cm" fo:margin-bottom="0.05cm"', 'fo:font-size="10pt" fo:font-weight="bold" fo:color="#5A5345" fo:text-transform="uppercase"') +
    styleParagraphe("Pi", 'fo:margin-bottom="0.1cm"', 'fo:font-size="8.5pt" fo:font-style="italic" fo:color="#5A5345"') +
    styleParagraphe("PhT", "", 'fo:font-size="8.5pt" fo:font-weight="bold" fo:text-transform="uppercase"') +
    styleParagraphe("PhC", 'fo:text-align="center" fo:margin-bottom="0.05cm"', 'fo:font-size="8.5pt" fo:font-weight="bold" fo:text-transform="uppercase"') +
    styleParagraphe("Pc", 'fo:text-align="center" fo:margin="0cm"', "") +
    TAILLES_LIBELLES.map((taille) =>
      styleParagraphe(`Pg${String(taille).replace(".", "_")}`, 'fo:text-align="center" fo:margin="0cm"', `fo:font-size="${String(taille)}pt" fo:color="#5A5345"`),
    ).join("") +
    styleParagraphe("Pg2", 'fo:margin-top="0.45cm"', 'fo:font-size="9pt" fo:color="#5A5345"') +
    `<style:style style:name="PB" style:family="paragraph"><style:paragraph-properties fo:break-before="page"/></style:style>` +
    styleCellule("Cell") +
    styleCellule("CellK", "#F8F4EA") +
    styleCellule("CellH", "#F1ECE0") +
    styleCellule("CellM", undefined, "middle") +
    styleParagraphe("PcD", 'fo:text-align="end" fo:margin="0cm"', "") +
    `<style:style style:name="CellE" style:family="table-cell"><style:table-cell-properties fo:padding="0cm" fo:border="none" style:vertical-align="top"/></style:style>` +
    `<style:style style:name="CellN" style:family="table-cell"><style:table-cell-properties fo:padding="0cm" fo:border="none" style:vertical-align="bottom"/></style:style>` +
    redaction.stylesColonnes.join("");
  const contenu = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${ESPACES_DE_NOMS}><office:automatic-styles>${automatiques}</office:automatic-styles><office:body><office:text>${corps}</office:text></office:body></office:document-content>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${ESPACES_DE_NOMS}><office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="Calibri" fo:font-family="Calibri, Carlito, sans-serif" fo:font-size="10pt" fo:language="fr" fo:country="FR"/></style:default-style></office:styles><office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" style:print-orientation="portrait" fo:margin-top="1.2cm" fo:margin-bottom="1.2cm" fo:margin-left="1.2cm" fo:margin-right="1.2cm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles></office:document-styles>`;
  const manifeste = `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>${redaction.images.liste
    .map((image) => `<manifest:file-entry manifest:full-path="Pictures/${image.fichier}" manifest:media-type="image/png"/>`)
    .join("")}</manifest:manifest>`;
  const zip = new JSZip();
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" });
  zip.file("content.xml", contenu);
  zip.file("styles.xml", styles);
  zip.folder("META-INF")?.file("manifest.xml", manifeste);
  const images = zip.folder("Pictures");
  for (const image of redaction.images.liste) images?.file(image.fichier, image.donnees, { base64: true });
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
