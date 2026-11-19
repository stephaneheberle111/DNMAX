// SPDX-License-Identifier: CECILL-2.1
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { colonnesExport, echapperXml, type FicheExport } from "./modele";
import { construireOdt } from "./opendocument";
import { construireTableur } from "./tableur";
import { construireDocx } from "./word";

const NIVEAUX = ["Insuffisant", "Fragile", "Satisfaisant", "Très bonne maîtrise"];
/** Les tests tournent sans navigateur : chaque jauge est une « image » qui dit sa valeur. */
const dessin = (pourcentage: number | null): string => btoa(`jauge ${String(pourcentage)}`);

function fiche(changements: Partial<FicheExport> = {}): FicheExport {
  return {
    diplome: "DN MADE mention Objet",
    titre: "Maquette & assemblage",
    signature: "Lycée d'essai — Camille Durand",
    contexte: "DNO2 — Carnet — S3",
    consignes: "Rendre le carnet <complet>",
    prof: "Camille Durand",
    semestre: "S3",
    promotions: "DNO2",
    plusieursPromotions: false,
    livrables: ["Carnet"],
    niveaux: NIVEAUX,
    colonnes: colonnesExport(1, ["Carnet"], "Compétence opérationnelle"),
    lignes: [
      { cle: "one:C1.1", op: false, bloc: "1", code: "C1.1", lib: "Utiliser les outils", comp: "C1.1 — Outils", ec: "EC 1.1", ecn: "Humanités", livr: "Carnet" },
      { cle: "one:C2.1", op: false, bloc: "2", code: "C2.1", lib: "S'exprimer", comp: "C2.1 — Expression", ec: "EC 2.1", ecn: "Langues", livr: "Carnet" },
    ],
    etudiants: [],
    sceau: null,
    ...changements,
  };
}

const ETUDIANTS = [
  { nom: "Alix Martin", resultat: { n: { "one:C1.1": 2 }, p: { "one:C1.1": 70 }, obs: { "one:C1.1": "Bonne recherche" }, appr: "Travail régulier" } },
  { nom: "Sam Petit", resultat: { n: { "one:C1.1": 2 }, p: { "one:C1.1": 70 } } },
];

async function contenu(octets: Uint8Array, fichier: string): Promise<string> {
  const zip = await JSZip.loadAsync(octets);
  return (await zip.file(fichier)?.async("string")) ?? "";
}

describe("colonnesExport", () => {
  it("n'ajoute pas de colonne Livrable quand toutes les lignes ont les mêmes livrables", () => {
    expect(colonnesExport(2, ["Carnet", "Carnet"], "Attendu").map((colonne) => colonne.cle)).toEqual(["ecn", "comp", "lib", "niv", "obs"]);
  });

  it("ajoute une colonne Livrable quand les lignes diffèrent et que plusieurs livrables sont attendus", () => {
    expect(colonnesExport(2, ["Carnet", "Maquette"], "Attendu").map((colonne) => colonne.cle)).toContain("livr");
  });

  it("titre « Niveau de maîtrise » la colonne de la jauge", () => {
    expect(colonnesExport(1, [], "Attendu").find((colonne) => colonne.niveau)?.titre).toBe("Niveau de maîtrise");
  });

  it("nomme la colonne de formulation comme réglé dans Préférences", () => {
    expect(colonnesExport(1, [], "Attendu").find((colonne) => colonne.cle === "lib")?.titre).toBe("Attendu");
  });
});

describe("construireDocx", () => {
  it("produit une fiche vierge avec le titre, la signature et des jauges vides", async () => {
    const document = await contenu(await construireDocx(fiche(), dessin), "word/document.xml");
    expect(document).toContain("Maquette &amp; assemblage");
    expect(document).toContain("Lycée d'essai — Camille Durand");
    expect(document).toContain("Rendre le carnet &lt;complet&gt;");
    expect(document).not.toContain('w:type="page"');
    expect(document).not.toContain("Étudiant :");
  });

  it("parle de niveau de maîtrise, pas de niveau d'acquisition, dans la grille et sa consigne", async () => {
    const document = await contenu(await construireDocx(fiche(), dessin), "word/document.xml");
    expect(document).toContain("Niveau de maîtrise");
    expect(document).not.toMatch(/Niveau d(&apos;|')acquisition/);
  });

  it("sépare les fiches des étudiants par un saut de page et nomme chacun", async () => {
    const document = await contenu(await construireDocx(fiche({ etudiants: ETUDIANTS }), dessin), "word/document.xml");
    expect(document.match(/w:type="page"/g)).toHaveLength(1);
    expect(document).toContain("Étudiant : Alix Martin");
    expect(document).toContain("Bonne recherche");
    expect(document).toContain("Travail régulier");
  });

  it("partage une seule image entre les jauges de même valeur", async () => {
    const zip = await JSZip.loadAsync(await construireDocx(fiche({ etudiants: ETUDIANTS }), dessin));
    const images = Object.keys(zip.files).filter((nom) => nom.startsWith("word/media/") && !zip.files[nom]?.dir);
    // Valeurs rencontrées : 70 (C1.1, deux fois) et vide (C2.1, deux fois).
    expect(images).toHaveLength(2);
  });

  it("omet les consignes quand il n'y en a pas, et dit qu'aucune compétence n'est retenue", async () => {
    const document = await contenu(await construireDocx(fiche({ consignes: "", lignes: [] }), dessin), "word/document.xml");
    expect(document).not.toContain("Consignes et attendus");
    expect(document).toContain("Aucune compétence sélectionnée.");
  });

  it("place le sceau en tête quand il est demandé", async () => {
    const zip = await JSZip.loadAsync(await construireDocx(fiche({ sceau: btoa("sceau") }), dessin));
    expect(await zip.file("word/media/g1.png")?.async("string")).toBe("sceau");
  });
});

describe("construireOdt", () => {
  it("produit un document OpenDocument dont le type est déclaré en premier, sans compression", async () => {
    const zip = await JSZip.loadAsync(await construireOdt(fiche(), dessin));
    expect(Object.keys(zip.files)[0]).toBe("mimetype");
    expect(await zip.file("mimetype")?.async("string")).toBe("application/vnd.oasis.opendocument.text");
  });

  it("reprend titre, signature et consignes, échappés", async () => {
    const document = await contenu(await construireOdt(fiche(), dessin), "content.xml");
    expect(document).toContain("Maquette &amp; assemblage");
    expect(document).toContain("Lycée d'essai — Camille Durand");
    expect(document).toContain("Rendre le carnet &lt;complet&gt;");
  });

  it("parle de niveau de maîtrise, pas de niveau d'acquisition, dans la grille et sa consigne", async () => {
    const document = await contenu(await construireOdt(fiche(), dessin), "content.xml");
    expect(document).toContain("Niveau de maîtrise");
    expect(document).not.toMatch(/Niveau d(&apos;|')acquisition/);
  });

  it("commence chaque fiche d'étudiant, sauf la première, par un saut de page", async () => {
    const document = await contenu(await construireOdt(fiche({ etudiants: ETUDIANTS }), dessin), "content.xml");
    expect(document.match(/text:style-name="PB"\/>/g)).toHaveLength(1);
    expect(document).toContain("Étudiant : Sam Petit");
  });
});

describe("construireTableur", () => {
  const feuilles = (octets: Uint8Array): XLSX.WorkBook => XLSX.read(octets, { type: "array" });

  it("écrit en texte une valeur qui n'en est pas un, pour qu'elle ne devienne jamais une formule", () => {
    const piege = ["M. X", 'HYPERLINK("https://exemple.invalid","Barème")'] as unknown as string;
    const feuille = feuilles(construireTableur(fiche({ prof: piege }), "xlsx")).Sheets["Évaluation"] as XLSX.WorkSheet;
    const cellules = Object.values(feuille).filter((cellule): cellule is XLSX.CellObject => typeof cellule === "object" && cellule !== null && "t" in cellule);
    expect(cellules.some((cellule) => cellule.f !== undefined)).toBe(false);
  });

  it("sans étudiant, contient l'évaluation et les compétences", () => {
    expect(feuilles(construireTableur(fiche(), "xlsx")).SheetNames).toEqual(["Évaluation", "Compétences"]);
  });

  it("avec des étudiants, ajoute la grille de la promotion avec le nom du niveau atteint", () => {
    const classeur = feuilles(construireTableur(fiche({ etudiants: ETUDIANTS }), "xlsx"));
    expect(classeur.SheetNames).toEqual(["Évaluation", "Grille classe", "Compétences"]);
    const grille = XLSX.utils.sheet_to_json<string[]>(classeur.Sheets["Grille classe"] as XLSX.WorkSheet, { header: 1 });
    expect(grille.find((ligne) => ligne[0] === "Alix Martin")?.[1]).toBe("Satisfaisant");
  });

  it("met le titre en capitales en tête de l'évaluation", () => {
    const classeur = feuilles(construireTableur(fiche(), "ods"));
    const lignes = XLSX.utils.sheet_to_json<string[]>(classeur.Sheets["Évaluation"] as XLSX.WorkSheet, { header: 1 });
    expect(lignes[0]?.[0]).toBe("MAQUETTE & ASSEMBLAGE");
  });
});

describe("echapperXml", () => {
  it("retire les caractères qu'un document XML n'admet pas, et garde tabulation et retours à la ligne", () => {
    expect(echapperXml("a\u000Bb\u0000c\u001Fd\uFFFEe")).toBe("abcde");
    expect(echapperXml("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });

  it("retire une demi-paire isolée et garde un caractère hors du plan de base", () => {
    expect(echapperXml("a\uD83Db")).toBe("ab");
    expect(echapperXml("a\u{1F600}b")).toBe("a\u{1F600}b");
  });
});
