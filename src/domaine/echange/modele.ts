// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Lecture prudente des données tenues par l'interface historique.
 *
 * Ces données sont du JSON sans schéma, écrit par un code non typé : rien
 * n'est supposé, chaque valeur est vérifiée, et ce qui n'a pas la forme
 * attendue est écarté plutôt que de faire échouer l'ensemble.
 */

export const CLE_EVALUATIONS = "dnmade.fiches";
export const CLE_PROMOTIONS = "dnmade.promos";
export const CLE_DONNEES = "dnmade.data";

export type ObjetJson = Record<string, unknown>;

/** Une évaluation : seul son identifiant est exigé, le reste est transporté tel quel. */
export type Evaluation = ObjetJson & { id: string };

export interface Promotion {
  id: string;
  nom: string;
  diplomeId: string;
  /** Version du référentiel appliquée à la promotion, si l'enseignant en a choisi une. */
  versionId: string;
}

export interface Diplome {
  id: string;
  nom: string;
  mention: string;
}

/** Une version validée du référentiel d'un diplôme. */
export interface VersionReferentiel {
  id: string;
  date: string;
  /**
   * Date à laquelle l'enseignant de ce poste a attesté avoir vérifié cette
   * version et en assumer le contenu ; texte vide s'il ne l'a pas fait
   * (version reçue, livrée avec l'application, ou validée avant l'attestation).
   */
  attestation: string;
}

export interface DonneesEtablissement {
  diplomes: Diplome[];
  versions: Map<string, VersionReferentiel[]>;
  /** Version en vigueur de chaque diplôme. */
  versionsEnVigueur: Map<string, string>;
}

export function estObjet(valeur: unknown): valeur is ObjetJson {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function lireTexte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

/** Analyse un texte JSON ; rend `null` s'il est absent ou mal formé. */
export function analyserJson(texte: string | null | undefined): unknown {
  if (texte === null || texte === undefined) {
    return null;
  }
  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return null;
  }
}

export function estEvaluation(valeur: unknown): valeur is Evaluation {
  return estObjet(valeur) && typeof valeur.id === "string" && valeur.id !== "";
}

/** Lit la liste des évaluations ; les éléments sans identifiant sont écartés. */
export function lireEvaluations(texte: string | null | undefined): Evaluation[] {
  const valeur = analyserJson(texte);
  return Array.isArray(valeur) ? valeur.filter(estEvaluation) : [];
}

/** Lit une promotion telle que l'interface historique la tient ; les champs absents valent texte vide. */
export function lirePromotion(promotion: ObjetJson): Promotion {
  return {
    id: lireTexte(promotion.id),
    nom: lireTexte(promotion.nom),
    diplomeId: lireTexte(promotion.diplomeId),
    versionId: lireTexte(promotion.refV),
  };
}

export function lirePromotions(texte: string | null | undefined): Promotion[] {
  const valeur = analyserJson(texte);
  if (!Array.isArray(valeur)) {
    return [];
  }
  return valeur.filter(estObjet).map(lirePromotion);
}

function lireTable(valeur: unknown): [string, unknown][] {
  return estObjet(valeur) ? Object.entries(valeur) : [];
}

export function lireDonneesEtablissement(texte: string | null | undefined): DonneesEtablissement {
  return lireDonneesEtablissementDe(analyserJson(texte));
}

/** Comme `lireDonneesEtablissement`, à partir de données déjà analysées (celles que tient l'interface historique). */
export function lireDonneesEtablissementDe(racine: unknown): DonneesEtablissement {
  const donnees = estObjet(racine) ? racine : {};
  const diplomes = (Array.isArray(donnees.diplomes) ? donnees.diplomes : []).filter(estObjet).map((diplome) => ({
    id: lireTexte(diplome.id),
    nom: lireTexte(diplome.nom),
    mention: lireTexte(diplome.mention),
  }));
  const versions = new Map(
    lireTable(donnees.versions).map(([id, liste]) => [
      id,
      (Array.isArray(liste) ? liste : []).filter(estObjet).map((version) => ({
        id: lireTexte(version.id),
        date: lireTexte(version.date),
        attestation: lireTexte(version.attestation),
      })),
    ]),
  );
  const versionsEnVigueur = new Map(lireTable(donnees.valide).map(([id, version]) => [id, lireTexte(version)]));
  return { diplomes, versions, versionsEnVigueur };
}

/**
 * Promotion à laquelle une évaluation est rattachée : par son identifiant,
 * sinon par le nom de l'une de ses classes (même règle que l'interface historique).
 */
export function trouverPromotion(evaluation: Evaluation, promotions: Promotion[]): Promotion | null {
  const parIdentifiant = promotions.find((promotion) => promotion.id !== "" && promotion.id === evaluation.promoId);
  if (parIdentifiant !== undefined) {
    return parIdentifiant;
  }
  const classes = Array.isArray(evaluation.classes) ? evaluation.classes : [];
  for (const classe of classes) {
    const parNom = promotions.find((promotion) => promotion.nom !== "" && promotion.nom === classe);
    if (parNom !== undefined) {
      return parNom;
    }
  }
  return null;
}
