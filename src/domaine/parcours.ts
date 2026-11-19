// SPDX-License-Identifier: CECILL-2.1
import {
  analyserJson,
  CLE_DONNEES,
  CLE_EVALUATIONS,
  CLE_PROMOTIONS,
  estObjet,
  lireDonneesEtablissementDe,
  lireEvaluations,
} from "./echange/modele";
import type { Entrees } from "./magasin-memoire";
import { diplomeAReferentielValide } from "./validation-referentiel";

/** Visites guidées proposées par l'application. */
export const PARCOURS = ["prise-en-main", "eleves", "niveaux"] as const;
export type IdentifiantParcours = (typeof PARCOURS)[number];

/** Entrée du magasin où sont notées les visites déjà vues (terminées ou passées). */
export const CLE_PARCOURS = "dnmax.parcours";
export const CLE_MODULES = "dnmade.modules";

/** Ce que l'enseignant a déjà mis en place, tel que le lit la visite pour savoir où il en est. */
export interface Avancement {
  referentiel: boolean;
  /** Au moins un diplôme a une version en vigueur attestée par l'enseignant. */
  referentielValide: boolean;
  promotions: number;
  elevesInscrits: number;
  /** Enseignants dont le prénom et le nom sont saisis. */
  enseignants: number;
  repartition: boolean;
  /** Évaluations enregistrées par l'enseignant ; les brouillons, gardés automatiquement, ne comptent pas. */
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

/** Texte non vide après suppression des espaces. */
function rempli(valeur: unknown): boolean {
  return typeof valeur === "string" && valeur.trim() !== "";
}

/**
 * Enseignants nommés : prénom et nom saisis tous deux, ou, pour une fiche
 * ancienne sans prénom ni nom séparés, un nom affiché. Une ligne qu'on vient
 * d'ajouter, encore vide ou à moitié remplie, ne compte pas.
 */
function compterEnseignantsNommes(enseignants: unknown): number {
  if (!Array.isArray(enseignants)) {
    return 0;
  }
  return enseignants.filter((enseignant) => {
    if (!estObjet(enseignant)) {
      return false;
    }
    const separes = "prenom" in enseignant || "nomFam" in enseignant;
    return separes ? rempli(enseignant.prenom) && rempli(enseignant.nomFam) : rempli(enseignant.nom);
  }).length;
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
  const etablissement = lireDonneesEtablissementDe(racine);
  return {
    referentiel: longueur(dictionnaire.competences) > 0,
    referentielValide: etablissement.diplomes.some((diplome) => diplomeAReferentielValide(etablissement, diplome.id)),
    promotions: listePromotions.filter(estObjet).length,
    elevesInscrits: listePromotions.reduce((total: number, promotion) => total + compterEleves(promotion), 0),
    enseignants: compterEnseignantsNommes(donnees.enseignants),
    repartition: contientUneAttribution(donnees.affectH) || contientUneAttribution({ courant: donnees.affect }),
    evaluations: lireEvaluations(entrees[CLE_EVALUATIONS]).filter((evaluation) => evaluation.brouillon !== true).length,
    moduleEleves: modulesActifs.eleves === true,
    moduleNiveaux: modulesActifs.dn === true,
  };
}

/**
 * Vrai si des collègues sont déclarés : l'enseignant de l'installation figure
 * déjà dans la liste dès le premier lancement, il en faut donc au moins un autre.
 */
export function colleguesDeclares(avancement: Pick<Avancement, "enseignants">): boolean {
  return avancement.enseignants > 1;
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

/** Clé de session où la visite note où elle en est, pour reprendre après un rechargement de la page. */
export const CLE_REPRISE = "dnmax.parcours.reprise";

export interface Reprise {
  identifiant: IdentifiantParcours;
  index: number;
}

/** Lit l'étape où reprendre ; `null` si rien n'est noté ou si la note est illisible. */
export function lireReprise(texte: string | null): Reprise | null {
  const valeur = analyserJson(texte);
  if (!estObjet(valeur)) {
    return null;
  }
  const { identifiant, index } = valeur;
  if (typeof identifiant !== "string" || !estIdentifiantParcours(identifiant)) {
    return null;
  }
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
    return null;
  }
  return { identifiant, index };
}

/** Une salve du bouquet final : son centre, son nombre d'éclats, son départ et sa portée (multiple de la gerbe ordinaire). */
export interface Salve {
  x: number;
  y: number;
  nombre: number;
  delaiMs: number;
  ampleur: number;
}

/** Ce qui fait réafficher la bulle de la visite : une nouvelle étape, un objectif atteint, une boîte de l'application ouverte ou refermée. */
export type MotifAffichage = "etape" | "salut" | "boite";

/**
 * Vrai si la bulle rejoue son apparition animée (petit rebond) en se
 * réaffichant. Elle salue ainsi une nouvelle étape ou un objectif atteint ;
 * quand seul son texte change parce qu'une boîte de l'application s'ouvre ou
 * se referme, rejouer le rebond la ferait trembler sur place.
 */
export function rejouerApparition(motif: MotifAffichage): boolean {
  return motif !== "boite";
}

/**
 * Vrai quand le bouquet final doit partir : à l'arrivée sur la dernière page
 * de la visite, une seule fois par visite (revenir en arrière puis y retourner
 * ne le relance pas). Fermer la visite ne le lance jamais. Une visite réduite à
 * une page n'a pas de « fin » à saluer.
 */
export function doitLancerBouquet(etat: { index: number; nombreEtapes: number; dejaLance: boolean }): boolean {
  return !etat.dejaLance && etat.nombreEtapes > 1 && etat.index === etat.nombreEtapes - 1;
}

/**
 * Bouquet final de confettis, à l'arrivée sur la dernière page d'une visite : sept
 * salves réparties sur la largeur de la fenêtre, dans le tiers haut, qui
 * partent l'une après l'autre, la dernière au centre et plus ample. Sans
 * hasard, pour rester identique d'une fois à l'autre.
 */
export function salvesBouquetFinal(largeur: number, hauteur: number): Salve[] {
  const l = Math.max(0, largeur);
  const h = Math.max(0, hauteur);
  const positions: readonly [number, number][] = [
    [0.2, 0.3],
    [0.8, 0.25],
    [0.5, 0.2],
    [0.35, 0.4],
    [0.65, 0.38],
    [0.12, 0.18],
    [0.88, 0.2],
  ];
  const salves = positions.map(([px, py], rang) => ({ x: Math.round(l * px), y: Math.round(h * py), nombre: 24, delaiMs: rang * 180, ampleur: 2 + (rang % 2) }));
  salves.push({ x: Math.round(l / 2), y: Math.round(h * 0.33), nombre: 40, delaiMs: positions.length * 180 + 120, ampleur: 4 });
  return salves;
}

/** Direction du bas-droit de la roue, en radians : à l'écran, les ordonnées croissent vers le bas. */
export const ANGLE_BAS_DROITE = Math.PI / 4;

/**
 * Parmi des éléments de la roue repérés par leur angle (radians), l'identifiant
 * du plus proche de la direction `cible`, à un tour près ; `null` sans élément
 * dont l'angle soit un nombre.
 */
export function plusProcheDeLAngle(elements: readonly { id: string; angle: number }[], cible: number): string | null {
  const tour = 2 * Math.PI;
  let meilleur: { id: string; ecart: number } | null = null;
  for (const element of elements) {
    if (!Number.isFinite(element.angle)) continue;
    const ecart = Math.abs((((element.angle - cible) % tour) + tour + Math.PI) % tour - Math.PI);
    if (meilleur === null || ecart < meilleur.ecart) meilleur = { id: element.id, ecart };
  }
  return meilleur?.id ?? null;
}
