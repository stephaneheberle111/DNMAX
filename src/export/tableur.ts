// SPDX-License-Identifier: CECILL-2.1
/**
 * Export tableur (Excel .xlsx, ou OpenDocument .ods) d'une évaluation :
 * la grille, la grille de la promotion avec les niveaux de chaque étudiant
 * (module Étudiants), et la liste des compétences.
 */
import * as XLSX from "xlsx";
import { nomDuNiveau } from "../editeur/jauge";
import { pourcentageDe, type FicheExport } from "./modele";

/**
 * Ramène une valeur à ce qu'une cellule peut contenir : un nombre ou un texte.
 *
 * La bibliothèque prend un objet ou un tableau pour une cellule déjà
 * construite, formule comprise. Les champs d'une évaluation peuvent venir
 * d'un fichier reçu : rien d'autre qu'un texte ou un nombre n'est donc écrit.
 */
function enCellule(valeur: unknown): string | number {
  if (typeof valeur === "string") return valeur;
  if (typeof valeur === "number" && Number.isFinite(valeur)) return valeur;
  return typeof valeur === "boolean" ? String(valeur) : "";
}

function feuilleDe(lignes: readonly (readonly unknown[])[]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(lignes.map((ligne) => ligne.map(enCellule)));
}

/** Classeur complet, en octets. */
export function construireTableur(fiche: FicheExport, format: "xlsx" | "ods"): Uint8Array {
  const { colonnes, lignes } = fiche;
  const classeur = XLSX.utils.book_new();
  const cellules: unknown[][] = [];
  const fusions: XLSX.Range[] = [];
  cellules.push([(fiche.titre || "Évaluation").toUpperCase()]);
  fusions.push({ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(1, colonnes.length - 1) } });
  cellules.push([]);
  cellules.push([fiche.contexte]);
  if (fiche.prof !== "") cellules.push(["Enseignant·e", fiche.prof]);
  if (fiche.consignes !== "") {
    cellules.push([]);
    cellules.push(["Consignes / attendus", fiche.consignes]);
  }
  cellules.push([]);
  const entete = cellules.length;
  cellules.push(colonnes.map((colonne) => colonne.titre));
  for (const ligne of lignes) {
    cellules.push(
      colonnes.map((colonne) => {
        if (colonne.niveau) return "";
        const valeur = (ligne as unknown as Record<string, unknown>)[colonne.cle];
        return valeur ?? "";
      }),
    );
  }
  cellules.push([]);
  cellules.push(["Appréciation générale"]);
  cellules.push([]);
  cellules.push([]);
  const feuille = feuilleDe(cellules);
  feuille["!cols"] = colonnes.map((colonne) => ({ wch: colonne.largeur + 2 }));
  feuille["!merges"] = fusions;
  feuille["!rows"] = cellules.map((_, rang) => (rang === entete ? { hpt: 28 } : {}));
  XLSX.utils.book_append_sheet(classeur, feuille, "Évaluation");

  if (fiche.etudiants.length > 0) {
    const grille: unknown[][] = [
      [`Grille classe — ${fiche.titre}`, ""],
      ["Semestre", fiche.semestre],
      [fiche.plusieursPromotions ? "Promotions" : "Promotion", fiche.promotions],
      ["Livrables", fiche.livrables.join(" ; ")],
      [],
    ];
    grille.push(["Étudiant", ...lignes.map((ligne) => ligne.comp.replace(/\n/g, " / ").slice(0, 90))]);
    grille.push(["", ...lignes.map((ligne) => ligne.lib.slice(0, 70))]);
    for (const etudiant of fiche.etudiants) {
      grille.push([
        etudiant.nom,
        ...lignes.map((ligne) => nomDuNiveau(pourcentageDe(etudiant.resultat, ligne.cle, fiche.niveaux.length), fiche.niveaux)),
      ]);
    }
    grille.push([]);
    grille.push(["Échelle", ...fiche.niveaux]);
    const feuilleGrille = feuilleDe(grille);
    feuilleGrille["!cols"] = [{ wch: 26 }, ...lignes.map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(classeur, feuilleGrille, "Grille classe");
  }

  const competences: unknown[][] = [["Bloc", "Code", "Compétence", "EC retenus", "Semestre"]];
  for (const ligne of lignes) competences.push([ligne.bloc, ligne.code, ligne.lib, ligne.ec, fiche.semestre]);
  XLSX.utils.book_append_sheet(classeur, feuilleDe(competences), "Compétences");
  return new Uint8Array(XLSX.write(classeur, { bookType: format, type: "array" }) as ArrayBuffer);
}
