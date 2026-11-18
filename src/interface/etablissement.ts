// SPDX-License-Identifier: CECILL-2.1
/**
 * Mon établissement, tel que l'interface le prépare : barre des volets, volet
 * Établissement, Répartition de service (historisée par année scolaire),
 * volet Promotions, et suppression en deux temps commune aux éditeurs.
 *
 * Repris du fichier historique (décision 38). Le temps de la reprise, ces
 * fonctions sont publiées sur la fenêtre sous leur ancien nom, que le fichier
 * historique appelle encore ; les écrans sont dans `etablissement/`, les
 * règles dans `domaine/repartition`.
 */
import { referentielDe } from "../domaine/modele-donnees";
import { aEuLaPromotion, anneesProposees, ecsDeLAnnee, type EcDeLAnnee } from "../domaine/repartition";
import { peindrePromotions } from "../etablissement/promotions";
import { peindreRepartition, peindreVoletEtablissement } from "../etablissement/volets";
import { etat, type Objet } from "./etat";
import {
  anneeDeFormation,
  anneeScolaire,
  calendrier,
  debutAnneeScolaire,
  dureePromotion,
  enregistrerPromotions,
  nomAutomatique,
  nomCourt,
  normaliserPromotion,
  semestresDeLaAnnee,
} from "./promotions-calendrier";

/** Volets de Mon établissement, dans l'ordre de la barre. Les livrables proposés se règlent dans Préférences. */
export const VOLETS: Readonly<Record<string, string>> = {
  etab: "Établissement",
  diplome: "Diplômes et mentions",
  promos: "Promotions",
  enseignants: "Enseignants",
  affect: "Répartition de service",
};

/** Ce que le module appelle encore dans le fichier historique. */
interface FonctionsHistoriques {
  persistData(): void;
  toast(message: string): void;
  paintRef(): void;
  paintPrefs(): void;
  paintEditor(volet: string, hote: HTMLElement): void;
  dipVisibles(): Objet[];
  dipLabel(diplome: Objet): string;
  newId(prefixe: string): string;
  uid(): string;
  save(): void;
}

/** Fenêtre où vivent les fonctions publiées et celles du fichier historique. */
type Fenetre = Record<string, unknown>;

let fenetre: Fenetre = {};

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

function donnees(): Objet {
  return etat.donnees;
}

function ui(): Objet {
  return etat.ui.org as Objet;
}

function liste(valeur: unknown): Objet[] {
  return Array.isArray(valeur) ? (valeur as Objet[]) : [];
}

function diplomes(): Objet[] {
  return liste(donnees().diplomes);
}

function anneeDuJour(): string {
  return anneeScolaire(new Date());
}

/** Libellé d'une UE sans les tirets entre majuscules (« A-B » devient « AB »). */
function nomUe(nom: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- même conversion que l'interface historique
  return String(nom == null ? "" : nom)
    .replace(/([A-ZÀ-Ý])-([A-ZÀ-Ý])/g, "$1$2")
    .trim();
}

/** Suppression en deux temps : le premier clic arme le bouton et redessine l'onglet, le second supprime. */
export function armerSuppression(id: unknown, supprimer: () => void): void {
  if (etat.armement !== id) {
    etat.armement = id;
    if (etat.ui.tab === "org") peindreEtablissement();
    else if (etat.ui.tab === "pref") historique().paintPrefs();
    else historique().paintRef();
    return;
  }
  etat.armement = null;
  supprimer();
}

function armement(): { arme: string | null; armer(id: string, supprimer: () => void): void } {
  return { arme: etat.armement as string | null, armer: (id, supprimer) => { armerSuppression(id, supprimer); } };
}

/** Mon établissement : barre des volets, puis le volet choisi (Diplômes et mentions par défaut). */
export function peindreEtablissement(): void {
  const volet = VOLETS[ui().pane as string] ? (ui().pane as string) : "diplome";
  const barre = document.getElementById("orgNav");
  if (barre) {
    barre.replaceChildren(
      ...Object.entries(VOLETS).map(([cle, libelle]) => {
        const bouton = document.createElement("button");
        bouton.setAttribute("type", "button");
        bouton.setAttribute("data-opane", cle);
        bouton.setAttribute("aria-pressed", String(volet === cle));
        bouton.textContent = libelle;
        bouton.onclick = () => {
          ui().pane = cle;
          etat.armement = null;
          peindreEtablissement();
          window.scrollTo({ top: 0, behavior: "smooth" });
        };
        return bouton;
      }),
    );
  }
  const hote = document.getElementById("orgPane");
  if (!hote) return;
  if (volet === "etab") {
    peindreVoletEtablissementCourant(hote);
    return;
  }
  if (volet === "promos") {
    peindreVoletPromotions(hote);
    return;
  }
  if (volet === "affect") {
    peindreVoletRepartition(hote);
    return;
  }
  historique().paintEditor(volet, hote);
}

/** Volet Établissement : fiche de l'établissement, créée vide au besoin, et calendrier. */
export function peindreVoletEtablissementCourant(hote: HTMLElement): void {
  donnees().etab = donnees().etab || { nom: "", uai: "", ville: "", academie: "", contactDpo: "" };
  const calendrierEtablissement = calendrier();
  peindreVoletEtablissement(hote, {
    etablissement: donnees().etab as Objet,
    calendrier: { rentree: calendrierEtablissement.rentree, bascule: calendrierEtablissement.bascule },
    enregistrer: () => {
      historique().persistData();
    },
  });
}

/** EC de l'année de la promotion (à l'année scolaire donnée, celle du jour par défaut), dans le référentiel de sa mention. */
export function ecsDeLaPromotion(promotion: Objet, annee?: unknown): EcDeLAnnee[] {
  const rang = anneeDeFormation(promotion, annee || anneeDuJour());
  return ecsDeLAnnee(referentielDe(donnees(), promotion.diplomeId as string).ecs, (donnees().dico ?? {}) as Objet, rang);
}

/** Répartition de service, par année scolaire : `affectH["2026-2027"][promotion][ec] = [enseignant…]`, créée au besoin. */
export function historiqueRepartition(): Record<string, Record<string, Record<string, string[]>> | undefined> {
  donnees().affectH = donnees().affectH || {};
  return donnees().affectH as Record<string, Record<string, Record<string, string[]>> | undefined>;
}

/** Répartition d'une promotion pour une année scolaire (celle du jour par défaut), créée vide au besoin. */
export function repartitionDe(promotion: string, annee?: string): Record<string, string[]> {
  const historiqueComplet = historiqueRepartition();
  const scolaire = annee || anneeDuJour();
  const parPromotion = (historiqueComplet[scolaire] = historiqueComplet[scolaire] || {});
  return parPromotion[promotion] || (parPromotion[promotion] = {});
}

/** Répartition d'une promotion pour une année scolaire, sans rien créer (vide si absente). */
export function repartitionLue(promotion: string, annee?: string): Record<string, string[]> {
  return (historiqueRepartition()[annee || anneeDuJour()] || {})[promotion] || {};
}

/** L'enseignant a-t-il eu cette promotion, une année ou une autre ? */
export function aEuLaPromotionDonnee(promotion: unknown, enseignant: unknown): boolean {
  return aEuLaPromotion(historiqueRepartition(), promotion, enseignant);
}

/** Volet Répartition de service : les promotions en cours de l'année choisie, et qui assure chaque EC. */
export function peindreVoletRepartition(hote: HTMLElement): void {
  const lesDonnees = donnees();
  const courante = anneeDuJour();
  const annees = anneesProposees(debutAnneeScolaire(courante) ?? 0);
  const annee = annees.includes(ui().affY as string) ? (ui().affY as string) : courante;
  ui().affY = annee;
  const enCours = etat.promotions.map(normaliserPromotion).filter((promotion) => {
    const rang = anneeDeFormation(promotion, annee);
    return rang >= 1 && rang <= dureePromotion(promotion);
  });
  const rangDiplome = (id: unknown): number => diplomes().findIndex((diplome) => diplome.id === id);
  enCours.sort((une, autre) => rangDiplome(une.diplomeId) - rangDiplome(autre.diplomeId) || anneeDeFormation(une, annee) - anneeDeFormation(autre, annee));
  const enseignants = liste(lesDonnees.enseignants);
  const vide = !enseignants.length || !enCours.length;
  const promotion = vide ? null : (enCours.find((candidate) => candidate.id === ui().aff) ?? enCours[0] ?? null);
  if (promotion) ui().aff = promotion.id;
  const repartition = promotion ? repartitionDe(promotion.id as string, annee) : {};
  const rang = promotion ? anneeDeFormation(promotion, annee) : 0;
  peindreRepartition(hote, {
    annees,
    anneeCourante: courante,
    annee,
    promotions: enCours.map((candidate) => ({
      id: candidate.id as string,
      court: nomCourt(candidate) || "",
      nom: (candidate.nom as string) || "",
      diplome: historique().dipLabel(diplomes().find((diplome) => diplome.id === candidate.diplomeId) ?? {}),
    })),
    promotion: promotion ? (promotion.id as string) : "",
    ecs: promotion ? ecsDeLaPromotion(promotion, annee) : [],
    enseignants: enseignants.map((enseignant) => ({ id: enseignant.id as string, nom: enseignant.nom as string })),
    repartition,
    anneeFormation: rang,
    semestres: promotion ? semestresDeLaAnnee(rang) : [],
    manque: { enseignants: !enseignants.length, promotions: !enCours.length },
    nomUe,
    choisirAnnee: (choisie) => {
      ui().affY = choisie;
      peindreEtablissement();
    },
    choisirPromotion: (id) => {
      ui().aff = id;
      peindreEtablissement();
    },
    enregistrer: (nouvelle) => {
      if (!promotion) return;
      const historiqueComplet = historiqueRepartition();
      const parPromotion = (historiqueComplet[annee] = historiqueComplet[annee] || {});
      parPromotion[promotion.id as string] = nouvelle;
      historique().persistData();
      peindreEtablissement();
    },
  });
}

/** Volet Promotions : liste, ajout, suppression et étudiants de chaque promotion. */
export function peindreVoletPromotions(hote: HTMLElement): void {
  const lesDonnees = donnees();
  const annee = anneeDuJour();
  etat.promotions.forEach(normaliserPromotion);
  const libelle = (id: unknown): string => historique().dipLabel(diplomes().find((diplome) => diplome.id === id) ?? {});
  peindrePromotions(hote, {
    promotions: () => etat.promotions,
    ordreDiplomes: diplomes().map((diplome) => diplome.id as string),
    diplomes: historique()
      .dipVisibles()
      .map((diplome) => ({ id: diplome.id as string, libelle: historique().dipLabel(diplome) })),
    libelleDiplome: libelle,
    anneeScolaire: annee,
    moduleEleves: !!etat.modules.eleves,
    ouverte: (ui().promo as string) || "",
    basculer: (id) => {
      ui().promo = ui().promo === id ? "" : id;
      peindreEtablissement();
    },
    anneeFormation: (promotion) => anneeDeFormation(promotion, annee),
    duree: dureePromotion,
    nomCourt: (promotion) => nomCourt(promotion) || "",
    renommer: (promotion) => {
      promotion.nom = nomAutomatique(promotion);
    },
    ajouterPromotion: () => {
      const promotion: Objet = { id: historique().uid(), nom: "", debut: debutAnneeScolaire(annee), diplomeId: lesDonnees.activeDiplome, eleves: "", liste: [] };
      promotion.nom = nomAutomatique(promotion);
      etat.promotions.push(promotion);
      enregistrerPromotions();
      peindreEtablissement();
      return promotion.id as string;
    },
    supprimerPromotion: (id) => {
      etat.promotions = etat.promotions.filter((promotion) => promotion.id !== id);
      if (etat.evaluation.promoId === id) {
        etat.evaluation.promoId = "";
        historique().save();
      }
    },
    nouvelIdentifiantEtudiant: () => historique().newId("s"),
    enregistrer: enregistrerPromotions,
    redessiner: peindreEtablissement,
    armement: armement(),
    annoncer: (texte) => {
      historique().toast(texte);
    },
  });
}

/** Publie ces fonctions sous leurs anciens noms, pour le fichier historique. */
export function publierEtablissement(cible: Fenetre): void {
  fenetre = cible;
  Object.assign(cible, {
    paintOrg: peindreEtablissement,
    paintEtab: peindreVoletEtablissementCourant,
    promoEcs: ecsDeLaPromotion,
    affH: historiqueRepartition,
    affectOf: repartitionDe,
    affGet: repartitionLue,
    teachesPromo: aEuLaPromotionDonnee,
    paintAffect: peindreVoletRepartition,
    paintPromosOrg: peindreVoletPromotions,
    armDel: armerSuppression,
  });
}
