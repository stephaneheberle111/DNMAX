// SPDX-License-Identifier: AGPL-3.0-or-later
import { estObjet, type ObjetJson } from "./echange/modele";

/**
 * Règles de la saisie des résultats d'un étudiant dans une évaluation.
 *
 * Le résultat d'un étudiant, tel que l'interface historique le range dans
 * `res[idEtudiant]` : `n` (niveau atteint, par ligne évaluée), `p` (position
 * du curseur, en pourcentage, par ligne), `c` (ancien détail du niveau),
 * `obs` (observation par ligne), `appr` (appréciation), et au plus une des
 * dates `rendu`, `nr` (non rendu) ou `disp` (dispensé).
 *
 * Ces fonctions ne modifient jamais ce qu'on leur passe : elles rendent un
 * nouveau résultat. Les valeurs viennent de l'interface historique, non
 * typée : tout ce qui n'a pas la forme attendue vaut « rien de saisi ».
 */

/** `""` : pas encore renseigné. */
export type StatutRendu = "" | "rendu" | "nr" | "disp";

/** Ce que l'enseignant doit savoir après un changement de statut. */
export type AvisRendu = "saisie-effacee" | "reste-rendu" | null;

/** Effet d'un niveau saisi sur le statut de rendu. */
export type EffetSurRendu = "inchange" | "devenu-rendu" | "absence-levee";

export interface AvancementEtudiant {
  /** Lignes de l'évaluation pour lesquelles un niveau est saisi. */
  n: number;
  /** Lignes à évaluer. */
  tot: number;
}

export interface BilanSaisie {
  /** Étudiants dont toutes les lignes ont un niveau. */
  faits: number;
  /** Étudiants dont une partie seulement des lignes a un niveau. */
  partiels: number;
}

function objet(valeur: unknown): ObjetJson {
  return estObjet(valeur) ? valeur : {};
}

function renseigne(valeur: unknown): boolean {
  return valeur !== null && valeur !== undefined && valeur !== "";
}

function estVrai(valeur: unknown): boolean {
  return Boolean(valeur);
}

/** Copie d'un objet privée de certaines clés. */
function sans(source: ObjetJson, ...cles: string[]): ObjetJson {
  return Object.fromEntries(Object.entries(source).filter(([cle]) => !cles.includes(cle)));
}

/**
 * Seuils, en pourcentage, qui séparent les niveaux d'une échelle : `nombre + 1`
 * valeurs de 0 à 100. Les deux niveaux extrêmes sont plus étroits que les
 * autres (60 / nombre), pour qu'un curseur poussé au bout tombe sans ambiguïté
 * sur le premier ou le dernier niveau. Une échelle vide ou d'un seul niveau
 * n'a pas de seuil intérieur.
 */
export function bornesNiveaux(nombre: number): number[] {
  if (!(nombre > 1)) {
    return [0, 100];
  }
  if (nombre === 2) {
    return [0, 50, 100];
  }
  const extremite = 60 / nombre;
  const milieu = (100 - 2 * extremite) / (nombre - 2);
  const bornes = [0];
  for (let rang = 1; rang < nombre; rang++) {
    bornes.push(extremite + (rang - 1) * milieu);
  }
  bornes.push(100);
  return bornes;
}

/** Tolérance sur un seuil : un curseur posé exactement dessus appartient au niveau supérieur malgré l'arrondi des flottants. */
const TOLERANCE_SEUIL = 1e-9;

/** Rang (à partir de 0) du niveau dans lequel tombe un pourcentage. */
export function niveauDuPourcentage(pourcentage: number, nombre: number): number {
  const bornes = bornesNiveaux(nombre);
  let niveau = 0;
  for (let rang = 1; rang < nombre; rang++) {
    const borne = bornes[rang];
    if (borne !== undefined && pourcentage >= borne - TOLERANCE_SEUIL) {
      niveau = rang;
    }
  }
  return niveau;
}

/** Colle le curseur à 0 dans le premier niveau et à 100 dans le dernier ; ailleurs, arrondit au pourcent. */
export function aimanterPourcentage(pourcentage: number, nombre: number): number {
  if (!(nombre > 1)) {
    return 100;
  }
  const bornes = bornesNiveaux(nombre);
  if (pourcentage < (bornes[1] ?? 0)) {
    return 0;
  }
  if (pourcentage >= (bornes[nombre - 1] ?? 100)) {
    return 100;
  }
  return Math.round(pourcentage);
}

/**
 * Position du curseur à afficher pour une ligne : celle qui a été saisie si
 * elle correspond encore au niveau enregistré, sinon le milieu de ce niveau
 * (0 pour le premier, 100 pour le dernier). `null` si aucun niveau n'est saisi.
 */
export function pourcentageAffiche(resultat: unknown, cle: string, nombre: number): number | null {
  const lu = objet(resultat);
  const niveauSaisi = objet(lu.n)[cle];
  if (!renseigne(niveauSaisi)) {
    return null;
  }
  const niveau = Number(niveauSaisi);
  const position = objet(lu.p)[cle];
  if (position !== null && position !== undefined && niveauDuPourcentage(Number(position), nombre) === niveau) {
    return Number(position);
  }
  if (niveau <= 0) {
    return 0;
  }
  if (niveau >= nombre - 1) {
    return 100;
  }
  const bornes = bornesNiveaux(nombre);
  return Math.round(((bornes[niveau] ?? 0) + (bornes[niveau + 1] ?? 100)) / 2);
}

/** Vrai si au moins un niveau est saisi pour l'étudiant. */
export function aDesNiveaux(resultat: unknown): boolean {
  return Object.values(objet(objet(resultat).n)).some(renseigne);
}

/**
 * Statut de rendu d'un étudiant. « Non rendu » et « Dispensé » l'emportent ;
 * un niveau saisi vaut « Rendu » même si le statut n'a pas été renseigné.
 */
export function statutRendu(resultat: unknown): StatutRendu {
  const lu = objet(resultat);
  if (estVrai(lu.nr)) {
    return "nr";
  }
  if (estVrai(lu.disp)) {
    return "disp";
  }
  return estVrai(lu.rendu) || aDesNiveaux(lu) ? "rendu" : "";
}

/**
 * Change le statut de rendu d'un étudiant.
 *
 * « Non rendu » et « Dispensé » effacent ses niveaux, observations et
 * appréciation (avis `saisie-effacee` s'il y en avait). Revenir à « non
 * renseigné » alors que des niveaux sont saisis est refusé : il reste
 * « Rendu » (avis `reste-rendu`). La restitution (`rest`) n'est pas touchée.
 * Un statut inconnu vaut « non renseigné ».
 */
export function changerRendu(resultat: unknown, statut: unknown, aujourdhui: string): { resultat: ObjetJson; avis: AvisRendu } {
  const reste = sans(objet(resultat), "nr", "disp", "rendu");
  const avaitUneSaisie = aDesNiveaux(reste) || Object.values(objet(reste.obs)).some(estVrai) || estVrai(reste.appr);
  if (statut === "nr" || statut === "disp") {
    return {
      resultat: { ...reste, [statut]: aujourdhui, n: {}, c: {}, p: {}, obs: {}, appr: "" },
      avis: avaitUneSaisie ? "saisie-effacee" : null,
    };
  }
  if (statut === "rendu") {
    return { resultat: { ...reste, rendu: aujourdhui }, avis: null };
  }
  if (aDesNiveaux(reste)) {
    return { resultat: { ...reste, rendu: aujourdhui }, avis: "reste-rendu" };
  }
  return { resultat: reste, avis: null };
}

/**
 * Saisit (ou efface, avec `null`) le niveau d'une ligne à partir de la
 * position du curseur. Un niveau saisi vaut travail rendu : l'étudiant passe
 * « Rendu » s'il ne l'était pas (`devenu-rendu`), y compris s'il était noté
 * non rendu ou dispensé (`absence-levee`). Effacer un niveau ne change pas
 * le statut. L'ancien détail du niveau (`c`) est retiré pour cette ligne.
 */
export function noterNiveau(
  resultat: unknown,
  cle: string,
  pourcentage: number | null,
  nombre: number,
  aujourdhui: string,
): { resultat: ObjetJson; effet: EffetSurRendu } {
  const lu = objet(resultat);
  const niveaux = sans(objet(lu.n), cle);
  const positions = sans(objet(lu.p), cle);
  const suivant: ObjetJson = { ...lu, n: niveaux, p: positions };
  if (estObjet(lu.c)) {
    suivant.c = sans(lu.c, cle);
  }
  if (pourcentage === null) {
    return { resultat: suivant, effet: "inchange" };
  }
  suivant.n = { ...niveaux, [cle]: niveauDuPourcentage(pourcentage, nombre) };
  suivant.p = { ...positions, [cle]: pourcentage };
  if (estVrai(lu.rendu)) {
    return { resultat: suivant, effet: "inchange" };
  }
  const etaitAbsent = estVrai(lu.nr) || estVrai(lu.disp);
  return { resultat: { ...sans(suivant, "nr", "disp"), rendu: aujourdhui }, effet: etaitAbsent ? "absence-levee" : "devenu-rendu" };
}

/** Où en est la saisie d'un étudiant, pour les lignes de l'évaluation. */
export function avancementEtudiant(resultat: unknown, cles: readonly string[]): AvancementEtudiant {
  const niveaux = objet(objet(resultat).n);
  return { n: cles.filter((cle) => renseigne(niveaux[cle])).length, tot: cles.length };
}

/**
 * Où en est la saisie de l'évaluation. Un étudiant sans aucun niveau ne compte
 * ni comme fait ni comme partiel ; sans ligne à évaluer, personne n'est fait.
 */
export function bilanSaisie(resultats: unknown, idsEtudiants: readonly string[], cles: readonly string[]): BilanSaisie {
  const tous = objet(resultats);
  let faits = 0;
  let partiels = 0;
  for (const id of idsEtudiants) {
    const { n, tot } = avancementEtudiant(tous[id], cles);
    if (tot > 0 && n >= tot) {
      faits++;
    } else if (n > 0) {
      partiels++;
    }
  }
  return { faits, partiels };
}

/** Nombre d'étudiants dont le statut de rendu n'est pas renseigné. */
export function etudiantsSansRendu(resultats: unknown, idsEtudiants: readonly string[]): number {
  const tous = objet(resultats);
  return idsEtudiants.filter((id) => statutRendu(tous[id]) === "").length;
}

function longueur(valeur: unknown): number {
  return Array.isArray(valeur) ? valeur.length : 0;
}

/**
 * Vrai dès qu'une évaluation a un intitulé, un livrable ou une compétence :
 * c'est à partir de là qu'elle entre d'elle-même dans « Mes évaluations »
 * (décision 29). Un intitulé fait seulement d'espaces ne compte pas.
 */
export function evaluationCommencee(evaluation: unknown): boolean {
  const lue = objet(evaluation);
  const intitule = typeof lue.titre === "string" ? lue.titre.trim() : "";
  return intitule !== "" || longueur(lue.livrables) > 0 || longueur(lue.items) > 0;
}
