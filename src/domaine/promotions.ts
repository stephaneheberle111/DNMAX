// SPDX-License-Identifier: CECILL-2.1
/**
 * Mon établissement > Promotions : ordre des promotions, état à l'année
 * scolaire, et liste des étudiants de chaque promotion. Règles reprises
 * telles quelles de l'ancienne interface ; les promotions sont modifiées
 * sur place, comme elle les tient.
 */
import { completerPersonne, lignesNoms, nouvellePersonne } from "./personnes";

type Promotion = Record<string, unknown>;

/**
 * Promotions rangées par diplôme, dans l'ordre des diplômes, puis de la plus
 * récente à la plus ancienne. Une promotion d'un diplôme inconnu vient en tête.
 * La liste reçue n'est pas modifiée.
 */
export function ordrePromotions<T extends { diplomeId?: unknown; debut?: unknown }>(promotions: readonly T[], ordreDiplomes: readonly string[]): T[] {
  const rang = (promotion: T): number => ordreDiplomes.findIndex((id) => id === promotion.diplomeId);
  return promotions.slice().sort((a, b) => rang(a) - rang(b) || Number(b.debut) - Number(a.debut));
}

/**
 * État d'une promotion à l'année scolaire affichée : « à venir », « terminée »,
 * ou son nom court et son année de formation.
 */
export function etatPromotion(anneeFormation: number, duree: number, nomCourt: string): string {
  if (anneeFormation < 1) return "à venir";
  if (anneeFormation > duree) return "terminée";
  return `${nomCourt} · Année ${String(anneeFormation)}`;
}

function liste(promotion: Promotion): Record<string, unknown>[] {
  if (!Array.isArray(promotion.liste)) promotion.liste = [];
  return promotion.liste as Record<string, unknown>[];
}

/** Complète prénom et nom des étudiants et réécrit `eleves`, la liste texte « un nom par ligne ». */
export function rafraichirListe(promotion: Promotion): Promotion {
  const etudiants = liste(promotion);
  etudiants.forEach(completerPersonne);
  promotion.eleves = etudiants.map((etudiant) => etudiant.nom).join("\n");
  return promotion;
}

/**
 * Fait passer un étudiant d'une promotion à une autre, y compris d'une autre mention.
 *
 * @returns l'étudiant déplacé, ou `null` s'il n'est pas dans la promotion de départ
 */
export function deplacerEtudiant(depuis: Promotion, vers: Promotion, id: string): Record<string, unknown> | null {
  const etudiants = liste(depuis);
  const rang = etudiants.findIndex((etudiant) => etudiant.id === id);
  if (rang < 0) return null;
  const [etudiant] = etudiants.splice(rang, 1);
  if (etudiant === undefined) return null;
  liste(vers).push(etudiant);
  rafraichirListe(depuis);
  rafraichirListe(vers);
  return etudiant;
}

/**
 * Ajoute un étudiant par ligne non vide du texte saisi ou collé.
 *
 * @returns le nombre d'étudiants ajoutés ; à zéro, la promotion n'est pas touchée
 */
export function ajouterEtudiants(promotion: Promotion, texte: string, nouvelIdentifiant: () => string): number {
  const lignes = lignesNoms(texte);
  if (lignes.length === 0) return 0;
  const etudiants = liste(promotion);
  for (const ligne of lignes) etudiants.push({ ...nouvellePersonne(nouvelIdentifiant(), ligne) });
  rafraichirListe(promotion);
  return lignes.length;
}

/** Retire un étudiant de sa promotion. */
export function retirerEtudiant(promotion: Promotion, id: string): void {
  promotion.liste = liste(promotion).filter((etudiant) => etudiant.id !== id);
  rafraichirListe(promotion);
}
