// SPDX-License-Identifier: AGPL-3.0-or-later
import { analyserJson, CLE_DONNEES, CLE_EVALUATIONS, CLE_PROMOTIONS, estObjet, lireEvaluations } from "./echange/modele";
import type { Entrees } from "./magasin-memoire";

/** Visites guidées proposées par l'application. */
export const PARCOURS = ["prise-en-main", "eleves", "niveaux"] as const;
export type IdentifiantParcours = (typeof PARCOURS)[number];

/** Entrée du magasin où sont notées les visites déjà vues (terminées ou passées). */
export const CLE_PARCOURS = "dnmax.parcours";
export const CLE_MODULES = "dnmade.modules";

/** Ce que l'enseignant a déjà mis en place, tel que le lit la visite pour savoir où il en est. */
export interface Avancement {
  referentiel: boolean;
  promotions: number;
  elevesInscrits: number;
  enseignants: number;
  repartition: boolean;
  evaluations: number;
  moduleEleves: boolean;
  moduleNiveaux: boolean;
}

function longueur(valeur: unknown): number {
  return Array.isArray(valeur) ? valeur.length : 0;
}

/** Vrai si au moins un enseignement est attribué à quelqu'un, pour une année scolaire quelconque. */
function contientUneAttribution(repartition: unknown): boolean {
  if (!estObjet(repartition)) {
    return false;
  }
  return Object.values(repartition).some(
    (annee) =>
      estObjet(annee) &&
      Object.values(annee).some((promotion) => estObjet(promotion) && Object.values(promotion).some((ids) => longueur(ids) > 0)),
  );
}

function compterEleves(promotion: unknown): number {
  if (!estObjet(promotion)) {
    return 0;
  }
  const liste = longueur(promotion.liste);
  if (liste > 0) {
    return liste;
  }
  return typeof promotion.eleves === "string" ? promotion.eleves.split("\n").filter((ligne) => ligne.trim() !== "").length : 0;
}

/**
 * Lit, dans les données de l'interface, ce qui est déjà en place.
 * Toute entrée absente ou illisible compte pour « rien de fait ».
 */
export function lireAvancement(entrees: Entrees): Avancement {
  const racine = analyserJson(entrees[CLE_DONNEES]);
  const donnees = estObjet(racine) ? racine : {};
  const dictionnaire = estObjet(donnees.dico) ? donnees.dico : {};
  const promotions = analyserJson(entrees[CLE_PROMOTIONS]);
  const listePromotions = Array.isArray(promotions) ? promotions : [];
  const modules = analyserJson(entrees[CLE_MODULES]);
  const modulesActifs = estObjet(modules) ? modules : {};
  return {
    referentiel: longueur(dictionnaire.competences) > 0,
    promotions: listePromotions.filter(estObjet).length,
    elevesInscrits: listePromotions.reduce((total: number, promotion) => total + compterEleves(promotion), 0),
    enseignants: longueur(donnees.enseignants),
    repartition: contientUneAttribution(donnees.affectH) || contientUneAttribution({ courant: donnees.affect }),
    evaluations: lireEvaluations(entrees[CLE_EVALUATIONS]).length,
    moduleEleves: modulesActifs.eleves === true,
    moduleNiveaux: modulesActifs.dn === true,
  };
}

/** Visites déjà vues ; une valeur illisible vaut « aucune ». */
export function lireParcoursVus(texte: string | undefined): IdentifiantParcours[] {
  const valeur = analyserJson(texte);
  const vus = estObjet(valeur) && Array.isArray(valeur.vus) ? valeur.vus : [];
  return PARCOURS.filter((identifiant) => vus.includes(identifiant));
}

/** Texte à enregistrer après avoir vu une visite ; sans doublon, dans l'ordre des visites. */
export function noterParcoursVu(texte: string | undefined, identifiant: IdentifiantParcours): string {
  const vus = new Set(lireParcoursVus(texte));
  vus.add(identifiant);
  return JSON.stringify({ vus: PARCOURS.filter((candidat) => vus.has(candidat)) });
}

/** La visite de prise en main se lance d'elle-même tant qu'elle n'a été ni suivie ni passée. */
export function doitLancerAuDemarrage(entrees: Entrees): boolean {
  return !lireParcoursVus(entrees[CLE_PARCOURS]).includes("prise-en-main");
}

export function estIdentifiantParcours(valeur: string | undefined): valeur is IdentifiantParcours {
  return PARCOURS.some((identifiant) => identifiant === valeur);
}
