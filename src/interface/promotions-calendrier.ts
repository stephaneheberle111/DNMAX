// SPDX-License-Identifier: CECILL-2.1
/**
 * Promotions, années scolaires et calendrier, tels que l'interface les lit :
 * nom automatique et durée d'une promotion, son année de formation à une
 * année scolaire, son nom court (DNO2), année scolaire et semestre d'une
 * date selon le calendrier de l'établissement, semestre proposé pour
 * l'évaluation en cours.
 *
 * Repris du fichier historique (décision 38). Le temps de la reprise, ces
 * fonctions sont publiées sur la fenêtre sous leur ancien nom, que le fichier
 * historique appelle encore ; les règles elles-mêmes sont dans `domaine/`.
 */
import { codeDiplome } from "../domaine/diplomes";
import { anneeDeClasse, anneeScolaire as anneeScolaireDeLaDate, lireCalendrier, rangSemestre as rangSemestreDeLaDate, semestreSuggere, semestresDeLAnnee, type Calendrier } from "../domaine/evaluation";
import { codeAnnee } from "../domaine/modele-donnees";
import { rafraichirListe } from "../domaine/promotions";
import { etat, type Objet } from "./etat";

const SEMESTRES = ["S1", "S2", "S3", "S4", "S5", "S6"];

/** Ce que le module appelle encore dans le fichier historique. */
interface FonctionsHistoriques {
  setSemestre(semestre: string): void;
}

/** Fenêtre où vivent les fonctions publiées et celles du fichier historique. */
type Fenetre = Record<string, unknown>;

let fenetre: Fenetre = {};
let ecrire: (cle: string, valeur: string) => void = () => undefined;

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

function liste(valeur: unknown): Objet[] {
  return Array.isArray(valeur) ? (valeur as Objet[]) : [];
}

function diplomes(): Objet[] {
  return liste(etat.donnees.diplomes);
}

function anneeDuSemestre(semestre: unknown): number {
  return Math.floor(Math.max(0, SEMESTRES.indexOf(semestre as string)) / 2) + 1;
}

/** Première année (sur quatre chiffres) d'une année scolaire « 2025-2026 », ou `null`. */
export function debutAnneeScolaire(anneeScolaire: unknown): number | null {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- même conversion que l'interface historique
  const trouve = /(\d{4})/.exec(String(anneeScolaire || ""));
  return trouve ? Number(trouve[1]) : null;
}

/** Durée d'un diplôme en années (3 par défaut). */
export function dureeDiplome(id: unknown): number {
  return Number(diplomes().find((diplome) => diplome.id === id)?.duree) || 3;
}

export function dureePromotion(promotion: Objet): number {
  return dureeDiplome(promotion.diplomeId);
}

/** « DNO-2025-2028 » : code du diplôme, année d'entrée, année de sortie. */
export function nomAutomatique(promotion: Objet): string {
  const diplome = diplomes().find((candidat) => candidat.id === promotion.diplomeId) ?? {};
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- même concaténation que l'interface historique
  return `${codeDiplome(diplome) || "DN"}-${promotion.debut}-${String(Number(promotion.debut) + dureePromotion(promotion))}`;
}

/** Met une promotion à la forme courante (en place) : année d'entrée en nombre, diplôme existant, nom automatique, liste d'étudiants. */
export function normaliserPromotion(promotion: Objet): Objet {
  promotion.debut = Number(promotion.debut);
  if (!promotion.diplomeId || !diplomes().some((diplome) => diplome.id === promotion.diplomeId)) promotion.diplomeId = etat.donnees.activeDiplome;
  promotion.nom = nomAutomatique(promotion);
  if (!Array.isArray(promotion.liste)) rafraichirListe(promotion);
  return promotion;
}

/** Année de formation de la promotion à une année scolaire (1 sans année lisible ; peut sortir de la durée du diplôme). */
export function anneeDeFormation(promotion: Objet, anneeScolaire: unknown): number {
  normaliserPromotion(promotion);
  const debut = debutAnneeScolaire(anneeScolaire);
  return debut === null ? 1 : debut - Number(promotion.debut) + 1;
}

/** Calendrier de l'établissement (Mon établissement > Établissement). */
export function calendrier(): Calendrier {
  return lireCalendrier(etat.donnees.etab);
}

/** Date de référence de l'évaluation en cours : la date donnée, sinon sa distribution prévue, sa date, ou maintenant. */
export function dateDeReference(date?: unknown): Date {
  const evaluation = etat.evaluation;
  const valeur = new Date((date || evaluation.distribPrev || evaluation.date || Date.now()) as string | number | Date);
  return Number.isNaN(valeur.getTime()) ? new Date() : valeur;
}

export function anneeScolaire(date?: unknown): string {
  return anneeScolaireDeLaDate(dateDeReference(date), calendrier());
}

export function rangSemestre(date?: unknown): number {
  return rangSemestreDeLaDate(dateDeReference(date), calendrier());
}

/** Promotion à l'année scolaire donnée (par défaut celle de l'évaluation en cours) : `as` et `annee` (bornée à la durée) mis à jour, en place. */
export function promotionALAnnee(promotion: Objet, annee?: unknown): Objet {
  const scolaire = annee || anneeScolaire();
  const rang = anneeDeFormation(promotion, scolaire);
  promotion.as = scolaire;
  promotion.annee = Math.min(dureePromotion(promotion), Math.max(1, rang));
  return promotion;
}

/** Promotion de l'évaluation en cours, à son année scolaire, ou `null`. */
export function promotionCourante(): Objet | null {
  const promotion = etat.promotions.find((candidate) => candidate.id === etat.evaluation.promoId);
  return promotion ? promotionALAnnee(promotion) : null;
}

/** Nom court (DNO2, DNE1…) d'une promotion en cours à la date du jour ; texte vide sinon. */
export function nomCourt(promotion: Objet): string {
  normaliserPromotion(promotion);
  const rang = anneeDeFormation(promotion, anneeScolaire(new Date()));
  if (rang < 1 || rang > dureePromotion(promotion)) return "";
  const diplome = diplomes().find((candidat) => candidat.id === promotion.diplomeId) ?? {};
  return diplome.id === etat.donnees.activeDiplome ? codeAnnee(rang, etat.donnees) : codeDiplome(diplome) + String(rang);
}

/** Nom affiché d'une promotion : son nom court, sinon son nom ; un nom inconnu tel quel. */
export function nomAffiche(nom: string): string {
  const promotion = etat.promotions.find((candidate) => candidate.nom === nom);
  return promotion ? nomCourt(promotion) || (promotion.nom as string) : nom;
}

/** Promotions d'une évaluation (la courante par défaut), par leur nom affiché. */
export function promotionsAffichees(evaluation?: Objet): string {
  const source = evaluation ?? etat.evaluation;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- même conversion que l'interface historique
  const noms = Array.isArray(source.classes) ? (source.classes as string[]) : String(source.classe || "").split(/,\s*/).filter(Boolean);
  return noms.map(nomAffiche).join(", ");
}

export function enregistrerPromotions(): void {
  try {
    ecrire("dnmade.promos", JSON.stringify(etat.promotions));
  } catch {
    // Comme avant : une écriture refusée n'interrompt pas l'interface.
  }
}

export function semestresDeLaAnnee(annee: number): string[] {
  return semestresDeLAnnee(annee);
}

/** Code de l'année d'un semestre (« DNO2 »), texte vide pour un semestre inconnu. */
export function codeAnneeDuSemestre(semestre: string): string {
  const rang = SEMESTRES.indexOf(semestre);
  return rang < 0 ? "" : codeAnnee(Math.floor(rang / 2) + 1, etat.donnees);
}

/** Avec le module Niveaux d'acquisition : code de l'année et niveau du référentiel (« DNO2 · Guidé ») ; sinon rien. */
export function libelleNiveauDuSemestre(semestre: string): string {
  if (!etat.modules.dn) return "";
  const meta = (etat.referentiel.meta ?? {}) as Objet;
  const niveau = liste(meta.niveaux).find((candidat) => Number(candidat.annee) === anneeDuSemestre(semestre));
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- libellé tel que le référentiel le donne, comme avant
  return niveau?.label ? `${codeAnneeDuSemestre(semestre)} · ${String(niveau.label)}` : codeAnneeDuSemestre(semestre);
}

export function libelleAnnee(annee: number): string {
  return `Année ${String(annee)}${etat.modules.dn ? ` — ${codeAnnee(annee, etat.donnees)}` : ""}`;
}

export function anneeDeLaClasse(nom: unknown): number {
  return anneeDeClasse(nom);
}

/** Année de formation de l'évaluation en cours : celle de sa promotion, sinon celle, unique, de ses classes ; 0 si elle n'est pas unique. */
export function anneeDeLEvaluation(): number {
  const promotion = promotionCourante();
  if (promotion?.annee) return Number(promotion.annee);
  const anneeDe = (nom: string): number => {
    const autre = etat.promotions.find((candidate) => candidate.nom === nom);
    if (autre) {
      const rang = anneeDeFormation(autre, anneeScolaire());
      return rang >= 1 && rang <= dureePromotion(autre) ? rang : 0;
    }
    return anneeDeClasse(nom);
  };
  const annees = [...new Set(liste(etat.evaluation.classes).map((nom) => anneeDe(nom as unknown as string)).filter(Boolean))];
  return annees.length === 1 ? (annees[0] ?? 0) : 0;
}

export function semestrePropose(date?: unknown): string {
  return semestreSuggere(anneeDeLEvaluation(), dateDeReference(date), calendrier());
}

/** Cale le semestre de l'évaluation sur sa date, sauf s'il a été choisi à la main ; vrai s'il a changé. */
export function caleSemestreSurLaDate(): boolean {
  if (etat.evaluation.semManuel) return false;
  const propose = semestrePropose();
  if (propose && propose !== etat.evaluation.semestre) {
    historique().setSemestre(propose);
    return true;
  }
  return false;
}

/**
 * Publie ces fonctions sous leurs anciens noms, pour le fichier historique.
 * `ecrireStockage` enregistre une entrée (les promotions).
 */
export function publierPromotionsCalendrier(cible: Fenetre, ecrireStockage: (cle: string, valeur: string) => void): void {
  fenetre = cible;
  ecrire = ecrireStockage;
  Object.assign(cible, {
    asStart: debutAnneeScolaire,
    dipDuree: dureeDiplome,
    promoDuree: dureePromotion,
    promoNomAuto: nomAutomatique,
    migPromoCohorte: normaliserPromotion,
    promoAnneeAt: anneeDeFormation,
    promoLive: promotionALAnnee,
    curPromo: promotionCourante,
    promoShort: nomCourt,
    promoDisp: nomAffiche,
    classesDisp: promotionsAffichees,
    savePromos: enregistrerPromotions,
    dnOf: codeAnneeDuSemestre,
    dnLabel: libelleNiveauDuSemestre,
    anneeLabel: libelleAnnee,
    semsOfAnnee: semestresDeLaAnnee,
    dateFiche: dateDeReference,
    calendrier,
    anneeScolaire,
    rangSemestre,
    semSuggere: semestrePropose,
    applySemDate: caleSemestreSurLaDate,
    anneeOfClasse: anneeDeLaClasse,
    anneeFiche: anneeDeLEvaluation,
  });
}
