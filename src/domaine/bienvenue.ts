// SPDX-License-Identifier: CECILL-2.1
/*
 * Page de bienvenue : ce que le premier lancement met en place pour
 * l'enseignant (nom de l'établissement, promotions en cours de sa mention).
 * Calculs seuls : on leur passe les entrées et la date, ils rendent les entrées à écrire.
 */
import type { Entrees } from "./magasin-memoire";
import { CLE_DONNEES, CLE_EVALUATIONS, CLE_PROMOTIONS, analyserJson, estObjet, lireEvaluations, type ObjetJson } from "./echange/modele";

/** Entrée qui note que la page de bienvenue a été suivie (ou passée) : elle ne revient plus. */
export const CLE_BIENVENUE = "dnmax.bienvenue";

/** Durée d'un diplôme quand elle n'est pas renseignée : trois ans, comme le DN MADE. */
const DUREE_PAR_DEFAUT = 3;

/** Mois (de 0 à 11) où commence l'année scolaire : septembre. */
const MOIS_RENTREE = 8;

/** Année civile où a commencé l'année scolaire en cours à `date` (heure locale). */
export function debutAnneeScolaire(date: Date): number {
  return date.getMonth() >= MOIS_RENTREE ? date.getFullYear() : date.getFullYear() - 1;
}

/**
 * Années d'entrée des promotions en cours d'un diplôme de `duree` ans,
 * de la première année à la dernière. Une durée absente ou invalide vaut trois ans.
 */
export function anneesEntreePromotionsEnCours(debutAnnee: number, duree: number): number[] {
  const annees = Number.isInteger(duree) && duree > 0 ? duree : DUREE_PAR_DEFAUT;
  return Array.from({ length: annees }, (_, rang) => debutAnnee - rang);
}

/** Vrai si la page de bienvenue a déjà été suivie ou passée. */
export function bienvenueFaite(entrees: Entrees): boolean {
  const valeur = analyserJson(entrees[CLE_BIENVENUE]);
  return estObjet(valeur) && valeur.faite === true;
}

/**
 * La page de bienvenue (choix de la mention) s'affiche tant qu'elle n'a pas
 * été suivie, sur une installation encore sans référentiel ni évaluation :
 * une installation déjà utilisée ne la voit jamais.
 */
export function doitProposerBienvenue(entrees: Entrees, aUnReferentiel: boolean): boolean {
  return !bienvenueFaite(entrees) && !aUnReferentiel && lireEvaluations(entrees[CLE_EVALUATIONS]).length === 0;
}

/** Diplôme qui porte la version `versionId` ; `null` s'il n'y en a pas. */
export function diplomeDeVersion(entrees: Entrees, versionId: string): string | null {
  const donnees = analyserJson(entrees[CLE_DONNEES]);
  const versions = estObjet(donnees) && estObjet(donnees.versions) ? donnees.versions : {};
  for (const [diplomeId, liste] of Object.entries(versions)) {
    if (Array.isArray(liste) && liste.some((version) => estObjet(version) && version.id === versionId)) {
      return diplomeId;
    }
  }
  return null;
}

export interface Installation {
  /** Nom de l'établissement saisi ; ignoré s'il est vide. */
  nomEtablissement: string;
  /** Diplôme dont créer les promotions en cours ; `null` pour n'en créer aucune. */
  diplomeId: string | null;
  /** Année où a commencé l'année scolaire en cours. */
  debutAnnee: number;
  genererIdentifiant: () => string;
}

function dureeDuDiplome(donnees: ObjetJson, diplomeId: string): number {
  const diplomes: unknown[] = Array.isArray(donnees.diplomes) ? (donnees.diplomes as unknown[]) : [];
  const diplome = diplomes.find((candidat) => estObjet(candidat) && candidat.id === diplomeId);
  return estObjet(diplome) ? Number(diplome.duree) : DUREE_PAR_DEFAUT;
}

/**
 * Inscrit le nom de l'établissement, crée les promotions en cours du diplôme
 * choisi et note la bienvenue comme faite.
 *
 * Idempotent : une promotion du même diplôme et de la même année d'entrée
 * n'est jamais créée deux fois, et un nom vide ne remplace pas celui déjà saisi.
 * Les promotions sont créées sans étudiants, au format de l'interface
 * (qui leur donne leur nom au chargement).
 */
export function installerPremierEtablissement(entrees: Entrees, installation: Installation): Entrees {
  const racine = analyserJson(entrees[CLE_DONNEES]);
  const donnees: ObjetJson = estObjet(racine) ? { ...racine } : {};
  const resultat: Record<string, string> = { ...entrees, [CLE_BIENVENUE]: JSON.stringify({ faite: true }) };

  const nom = installation.nomEtablissement.trim();
  if (nom !== "") {
    donnees.etab = { ...(estObjet(donnees.etab) ? donnees.etab : {}), nom };
    resultat[CLE_DONNEES] = JSON.stringify(donnees);
  }

  const { diplomeId } = installation;
  if (diplomeId !== null) {
    const lues = analyserJson(entrees[CLE_PROMOTIONS]);
    const promotions: unknown[] = Array.isArray(lues) ? [...(lues as unknown[])] : [];
    for (const debut of anneesEntreePromotionsEnCours(installation.debutAnnee, dureeDuDiplome(donnees, diplomeId))) {
      const existe = promotions.some(
        (promotion) => estObjet(promotion) && promotion.diplomeId === diplomeId && Number(promotion.debut) === debut,
      );
      if (!existe) {
        promotions.push({ id: installation.genererIdentifiant(), debut, diplomeId, eleves: "", liste: [] });
      }
    }
    resultat[CLE_PROMOTIONS] = JSON.stringify(promotions);
  }
  return resultat;
}
