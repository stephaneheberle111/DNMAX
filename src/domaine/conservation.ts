// SPDX-License-Identifier: AGPL-3.0-or-later
import { CLE_BROUILLON, effacerEleve } from "./droits-eleve";
import { CLE_DONNEES, CLE_EVALUATIONS, CLE_PROMOTIONS, analyserJson, estObjet, type ObjetJson } from "./echange/modele";
import type { Entrees } from "./magasin-memoire";
import { CLE_INSTANTANE_EXEMPLE } from "./retrait-exemple";

/**
 * Durée de conservation des données d'élèves (RGPD : limitation de la conservation).
 *
 * Une promotion « sort » à la fin de l'année scolaire où s'achève son diplôme.
 * Ses données d'élèves sont échues quand la durée de conservation est passée
 * depuis cette sortie : DNMAX propose alors de les effacer, sans jamais le
 * faire seul. Les évaluations elles-mêmes (grilles, consignes) sont gardées.
 */

/** Durée d'un diplôme quand elle n'est pas renseignée (même règle que l'interface historique). */
const DUREE_DIPLOME_PAR_DEFAUT = 3;
/** Jour où une promotion est considérée comme sortie : lendemain de la fin de l'année scolaire. */
const JOUR_DE_SORTIE = "07-01";
/** Préfixe des identifiants d'élèves de promotion (« s » suivi d'un horodatage ou d'un tirage). */
const PREFIXE_ELEVE_PROMOTION = "s";
const PREFIXE_LIBRE = "libre";

export interface PromotionEchue {
  id: string;
  nom: string;
  /** Date de sortie, AAAA-MM-JJ. */
  sortie: string;
  /** Date à partir de laquelle ses données d'élèves sont échues, AAAA-MM-JJ. */
  echeance: string;
  eleves: number;
}

function lireListe(texte: string | undefined): unknown[] {
  const valeur = analyserJson(texte);
  return Array.isArray(valeur) ? valeur : [];
}

function dureesDiplomes(entrees: Entrees): Map<string, number> {
  const donnees = analyserJson(entrees[CLE_DONNEES]);
  const diplomes = estObjet(donnees) && Array.isArray(donnees.diplomes) ? donnees.diplomes : [];
  return new Map(
    diplomes
      .filter(estObjet)
      .filter((diplome) => typeof diplome.id === "string")
      .map((diplome) => [diplome.id as string, Number(diplome.duree) > 0 ? Number(diplome.duree) : DUREE_DIPLOME_PAR_DEFAUT]),
  );
}

function identifiantsEleves(promotion: ObjetJson): string[] {
  return (Array.isArray(promotion.liste) ? promotion.liste : [])
    .filter(estObjet)
    .map((eleve) => eleve.id)
    .filter((id): id is string => typeof id === "string" && id !== "");
}

/**
 * Promotions dont les données d'élèves ont dépassé la durée de conservation.
 * Une promotion sans élève, ou sans année d'entrée, n'est jamais proposée.
 *
 * @param aujourdHui date du jour, AAAA-MM-JJ
 * @param anneesConservation années de conservation après la sortie
 */
export function promotionsEchues(entrees: Entrees, aujourdHui: string, anneesConservation: number): PromotionEchue[] {
  const durees = dureesDiplomes(entrees);
  const echues: PromotionEchue[] = [];
  for (const promotion of lireListe(entrees[CLE_PROMOTIONS]).filter(estObjet)) {
    const debut = Number(promotion.debut);
    const eleves = identifiantsEleves(promotion).length;
    if (typeof promotion.id !== "string" || !Number.isInteger(debut) || eleves === 0) {
      continue;
    }
    const duree = durees.get(typeof promotion.diplomeId === "string" ? promotion.diplomeId : "") ?? DUREE_DIPLOME_PAR_DEFAUT;
    const sortie = `${String(debut + duree)}-${JOUR_DE_SORTIE}`;
    const echeance = `${String(debut + duree + anneesConservation)}-${JOUR_DE_SORTIE}`;
    if (aujourdHui >= echeance) {
      echues.push({ id: promotion.id, nom: typeof promotion.nom === "string" ? promotion.nom : "", sortie, echeance, eleves });
    }
  }
  return echues;
}

function evaluationsEtBrouillon(entrees: Entrees): ObjetJson[] {
  const evaluations = lireListe(entrees[CLE_EVALUATIONS]).filter(estObjet);
  const brouillon = analyserJson(entrees[CLE_BROUILLON]);
  return estObjet(brouillon) ? [...evaluations, brouillon] : evaluations;
}

/**
 * Identifiants d'élèves de promotion encore présents dans des évaluations
 * alors qu'ils ne figurent plus dans aucune promotion : des résultats laissés
 * derrière eux par le retrait d'un élève ou d'une promotion.
 */
export function identifiantsOrphelins(entrees: Entrees): string[] {
  const connus = new Set(lireListe(entrees[CLE_PROMOTIONS]).filter(estObjet).flatMap(identifiantsEleves));
  const trouves = new Set<string>();
  for (const evaluation of evaluationsEtBrouillon(entrees)) {
    const vises: unknown[] = Array.isArray(evaluation.eleveIds) ? evaluation.eleveIds : [];
    const ids: unknown[] = [...Object.keys(estObjet(evaluation.res) ? evaluation.res : {}), ...vises, evaluation.eleveId];
    for (const id of ids) {
      if (typeof id === "string" && id.startsWith(PREFIXE_ELEVE_PROMOTION) && !connus.has(id)) {
        trouves.add(id);
      }
    }
  }
  return [...trouves].sort();
}

function estRattachee(evaluation: ObjetJson, promotion: ObjetJson): boolean {
  const classes = Array.isArray(evaluation.classes) ? evaluation.classes : [];
  return evaluation.promoId === promotion.id || (typeof promotion.nom === "string" && classes.includes(promotion.nom));
}

/**
 * Dans les évaluations rattachées à ces promotions, retire la liste d'élèves
 * saisie à la main et ses résultats : l'interface historique ne s'en sert plus
 * dès qu'une promotion est choisie, mais les noms y restent écrits.
 */
function viderListesSaisies(entrees: Entrees, promotions: ObjetJson[]): Record<string, string> {
  const resultat: Record<string, string> = { ...entrees };
  const nettoyer = (evaluation: ObjetJson): ObjetJson => {
    if (!promotions.some((promotion) => estRattachee(evaluation, promotion))) {
      return evaluation;
    }
    const copie: ObjetJson = { ...evaluation };
    if (typeof copie.eleves === "string") {
      copie.eleves = "";
    }
    if (estObjet(copie.res)) {
      copie.res = Object.fromEntries(Object.entries(copie.res).filter(([id]) => !id.startsWith(PREFIXE_LIBRE)));
    }
    return copie;
  };
  if (CLE_EVALUATIONS in entrees) {
    resultat[CLE_EVALUATIONS] = JSON.stringify(
      lireListe(entrees[CLE_EVALUATIONS]).map((evaluation): unknown => (estObjet(evaluation) ? nettoyer(evaluation) : evaluation)),
    );
  }
  const brouillon = analyserJson(entrees[CLE_BROUILLON]);
  if (estObjet(brouillon)) {
    resultat[CLE_BROUILLON] = JSON.stringify(nettoyer(brouillon));
  }
  return resultat;
}

export interface BilanPurge {
  /** Élèves effacés, ceux des promotions et les identifiants orphelins confondus. */
  eleves: number;
}

/**
 * Efface les données d'élèves des promotions choisies et, si demandé, les
 * résultats orphelins. Les promotions restent, vides ; les évaluations restent,
 * sans résultats d'élèves. Partout ailleurs, rien ne change.
 */
export function purgerDonneesEleves(
  entrees: Entrees,
  promotionIds: readonly string[],
  avecOrphelins: boolean,
): { entrees: Entrees; bilan: BilanPurge } {
  const choisies = lireListe(entrees[CLE_PROMOTIONS])
    .filter(estObjet)
    .filter((promotion) => typeof promotion.id === "string" && promotionIds.includes(promotion.id));
  const identifiants = [...new Set([...choisies.flatMap(identifiantsEleves), ...(avecOrphelins ? identifiantsOrphelins(entrees) : [])])];
  let resultat: Entrees = entrees;
  if (identifiants.length > 0) {
    resultat = effacerEleve(resultat, { cle: "", nom: "", identifiants, promotions: [] }, { parNom: false }).entrees;
  }
  if (choisies.length > 0) {
    const nettoyees: Record<string, string> = viderListesSaisies(resultat, choisies);
    const instantane = analyserJson(resultat[CLE_INSTANTANE_EXEMPLE]);
    if (estObjet(instantane)) {
      const textes = (valeur: unknown): Entrees =>
        estObjet(valeur)
          ? Object.fromEntries(Object.entries(valeur).filter((paire): paire is [string, string] => typeof paire[1] === "string"))
          : {};
      nettoyees[CLE_INSTANTANE_EXEMPLE] = JSON.stringify({
        avant: viderListesSaisies(textes(instantane.avant), choisies),
        apres: viderListesSaisies(textes(instantane.apres), choisies),
      });
    }
    resultat = nettoyees;
  }
  return { entrees: resultat, bilan: { eleves: identifiants.length } };
}
