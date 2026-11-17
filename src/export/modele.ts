// SPDX-License-Identifier: CECILL-2.1
/**
 * Ce que reçoivent les exports Word, OpenDocument et tableur : une évaluation
 * déjà mise en forme pour le document (textes, colonnes, lignes), et ses
 * étudiants avec leurs résultats tels qu'enregistrés.
 */
import { pourcentageAffiche } from "../domaine/saisie-resultats";

/** Une colonne de la grille. `niveau` : la colonne de la jauge du niveau de maîtrise. */
export interface ColonneExport {
  readonly cle: string;
  readonly titre: string;
  /** Largeur relative (en caractères, pour le tableur). */
  readonly largeur: number;
  readonly niveau: boolean;
}

/** Une ligne de la grille : une compétence, ou un regroupement (`op`). */
export interface LigneExport {
  /** Clé des résultats (`one:C4.1` ou `op:<identifiant>`). */
  readonly cle: string;
  readonly op: boolean;
  readonly bloc: string | number;
  readonly code: string;
  readonly lib: string;
  readonly comp: string;
  readonly ec: string;
  readonly ecn: string;
  readonly livr: string;
}

export interface EtudiantExport {
  readonly nom: string;
  /** Résultat enregistré pour l'étudiant, tel quel (`n`, `p`, `obs`, `appr`), ou `undefined`. */
  readonly resultat: unknown;
}

export interface FicheExport {
  readonly diplome: string;
  readonly titre: string;
  /** Établissement et enseignants, qui signent le document ; chaîne vide s'il n'y a ni l'un ni les autres. */
  readonly signature: string;
  /** Promotions, livrables et semestre, en une ligne. */
  readonly contexte: string;
  readonly consignes: string;
  /** Enseignants, en une ligne (tableur). */
  readonly prof: string;
  readonly semestre: string;
  /** Nom des promotions, en une ligne. */
  readonly promotions: string;
  readonly plusieursPromotions: boolean;
  readonly livrables: readonly string[];
  readonly niveaux: readonly string[];
  readonly colonnes: readonly ColonneExport[];
  readonly lignes: readonly LigneExport[];
  /** Une fiche par étudiant ; sans étudiant, une seule fiche vierge. */
  readonly etudiants: readonly EtudiantExport[];
  /** Image du sceau DN MADE en base64 (PNG), ou `null` s'il n'est pas affiché. */
  readonly sceau: string | null;
}

/** Dessine l'image (PNG en base64) d'une jauge remplie jusqu'à `pourcentage`, ou vide (`null`). */
export type DessinJauge = (pourcentage: number | null, largeurPx: number, hauteurPx: number) => string;

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

/** Position saisie pour une ligne, ou `null`. */
export function pourcentageDe(resultat: unknown, cle: string, nombreNiveaux: number): number | null {
  return pourcentageAffiche(resultat ?? { n: {} }, cle, nombreNiveaux);
}

export function observationDe(resultat: unknown, cle: string): string {
  const observations = estObjet(resultat) && estObjet(resultat.obs) ? resultat.obs : {};
  const texte = observations[cle];
  return typeof texte === "string" ? texte : "";
}

export function appreciationDe(resultat: unknown): string {
  return estObjet(resultat) && typeof resultat.appr === "string" ? resultat.appr : "";
}

/** Échappe un texte pour XML. */
export function echapperXml(texte: string | number): string {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Colonnes de la grille. Une colonne « Livrable » n'apparaît que si
 * l'évaluation attend plusieurs livrables et que les lignes n'ont pas toutes les mêmes.
 */
export function colonnesExport(nombreLivrables: number, livrablesDesLignes: readonly string[], libelleCritere: string): ColonneExport[] {
  const colonnes: ColonneExport[] = [
    { cle: "ecn", titre: "Enseignement", largeur: 17, niveau: false },
    { cle: "comp", titre: "Compétence", largeur: 24, niveau: false },
  ];
  if (nombreLivrables > 1 && new Set(livrablesDesLignes).size > 1) colonnes.push({ cle: "livr", titre: "Livrable", largeur: 12, niveau: false });
  colonnes.push(
    { cle: "lib", titre: libelleCritere, largeur: 24, niveau: false },
    { cle: "niv", titre: "Niveau de maîtrise", largeur: 30, niveau: true },
    { cle: "obs", titre: "Observations", largeur: 17, niveau: false },
  );
  return colonnes;
}

/** Images à joindre au document (sceau, jauges), chacune une seule fois. */
export class ImagesDocument {
  readonly liste: { rid: string; fichier: string; donnees: string }[] = [];
  private readonly parCle = new Map<string, { rid: string; fichier: string; donnees: string }>();
  /** Numéro du dernier dessin placé dans le document (identifiants des images Word). */
  dessins = 0;

  /** L'image de clé `cle`, créée par `fabriquer` à sa première demande. */
  image(cle: string, fabriquer: () => string): { rid: string; fichier: string; donnees: string } {
    const existante = this.parCle.get(cle);
    if (existante !== undefined) return existante;
    const rang = this.liste.length + 1;
    const nouvelle = { rid: `rIdG${String(rang)}`, fichier: `g${String(rang)}.png`, donnees: fabriquer() };
    this.liste.push(nouvelle);
    this.parCle.set(cle, nouvelle);
    return nouvelle;
  }
}
