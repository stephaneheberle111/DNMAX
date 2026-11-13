// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entrees } from "../magasin-memoire";
import {
  fusionnerResultats,
  lirePromotionsBrutes,
  rapprocherListeLibre,
  rapprocherPromotion,
  type BilanResultats,
  type Correspondances,
} from "./donnees-eleves";
import { CLE_EVALUATIONS, CLE_PROMOTIONS, analyserJson, estEvaluation, type Evaluation, type ObjetJson } from "./modele";
import type { EvaluationEchangee, Paquet } from "./paquet";
import { normaliserNom, type ReferentielLocal } from "./referentiel";

/** Ce que l'import ferait des résultats d'étudiants d'une évaluation du fichier. */
export interface LigneResultats {
  /** Identifiant de l'évaluation concernée. */
  identifiant: string;
  /** Faux si la promotion de l'expéditeur ne peut être ni retrouvée ni créée ici. */
  possible: boolean;
  bilan: BilanResultats;
  /** Étudiants de l'expéditeur absents d'ici, qui seraient ajoutés. */
  elevesAjoutes: number;
  promotionCreee: boolean;
}

interface Preparation {
  ligne: LigneResultats;
  /** Champs à poser sur l'évaluation ; `null` si l'import est impossible. */
  champs: ObjetJson | null;
  promotions: unknown[];
}

function estIdentite(correspondances: Correspondances): boolean {
  return [...correspondances].every(([idRecu, idLocal]) => idRecu === idLocal);
}

/** Calcule, sans rien modifier, ce que deviendraient l'évaluation et les promotions. */
function preparer(
  locale: Evaluation | undefined,
  recue: EvaluationEchangee,
  promotions: unknown[],
  paquet: Paquet,
  catalogue: readonly ReferentielLocal[],
  remplacerDifferents: boolean,
  genererIdentifiant: () => string,
): Preparation | null {
  const donnees = recue.donneesEleves;
  if (donnees === null) {
    return null;
  }
  const impossible: Preparation = {
    ligne: {
      identifiant: recue.modele.id,
      possible: false,
      bilan: { nouveaux: 0, differents: 0, identiques: 0 },
      elevesAjoutes: 0,
      promotionCreee: false,
    },
    champs: null,
    promotions,
  };
  const champs: ObjetJson = {};
  let correspondances: Correspondances;
  let elevesAjoutes: number;
  let promotionCreee = false;
  let promotionsApres = promotions;

  if (donnees.promotionId === "") {
    const liste = rapprocherListeLibre(locale?.eleves, donnees.champs.eleves);
    correspondances = liste.correspondances;
    elevesAjoutes = liste.elevesAjoutes;
    champs.eleves = liste.texte;
  } else {
    const promotionRecue = paquet.promotions.find((promotion) => promotion.id === donnees.promotionId);
    if (promotionRecue === undefined) {
      return impossible;
    }
    const diplomeLocal = catalogue.find(
      (local) =>
        normaliserNom(local.diplome) === normaliserNom(promotionRecue.diplome) &&
        normaliserNom(local.mention) === normaliserNom(promotionRecue.mention),
    );
    const rapprochement = rapprocherPromotion(promotions, promotionRecue, diplomeLocal?.diplomeId ?? null, genererIdentifiant);
    if (rapprochement === null) {
      return impossible;
    }
    correspondances = rapprochement.correspondances;
    elevesAjoutes = rapprochement.elevesAjoutes;
    promotionCreee = rapprochement.promotionCreee;
    promotionsApres = rapprochement.promotions;
    // L'évaluation suit la promotion d'ici, sauf si elle en avait déjà une.
    if (typeof locale?.promoId !== "string" || locale.promoId === "") {
      champs.promoId = rapprochement.promotionId;
    }
    if (locale?.eleveIds === undefined && Array.isArray(donnees.champs.eleveIds)) {
      champs.eleveIds = donnees.champs.eleveIds
        .map((idRecu: unknown) => (typeof idRecu === "string" ? correspondances.get(idRecu) : undefined))
        .filter((idLocal) => idLocal !== undefined);
    }
  }

  const fusion = fusionnerResultats(locale?.res, donnees.champs.res, correspondances, remplacerDifferents);
  champs.res = fusion.resultats;
  // L'état des restitutions est indexé par étudiant : il n'est repris que si aucun identifiant n'a changé.
  if (locale?.restit === undefined && donnees.champs.restit !== undefined && estIdentite(correspondances)) {
    champs.restit = donnees.champs.restit;
  }
  return {
    ligne: { identifiant: recue.modele.id, possible: true, bilan: fusion.bilan, elevesAjoutes, promotionCreee },
    champs,
    promotions: promotionsApres,
  };
}

function lireEvaluationsBrutes(entrees: Entrees): unknown[] {
  const valeur = analyserJson(entrees[CLE_EVALUATIONS]);
  return Array.isArray(valeur) ? valeur : [];
}

/**
 * Calcule ce que l'import ferait des résultats d'étudiants du fichier, évaluation
 * par évaluation, sans rien modifier. Les évaluations sans données d'étudiants
 * n'ont pas de ligne.
 */
export function calculerPlanResultats(
  entrees: Entrees,
  paquet: Paquet,
  catalogue: readonly ReferentielLocal[],
): Map<string, LigneResultats> {
  const locales = new Map(
    lireEvaluationsBrutes(entrees)
      .filter(estEvaluation)
      .map((evaluation) => [evaluation.id, evaluation]),
  );
  const promotions = lirePromotionsBrutes(entrees[CLE_PROMOTIONS]);
  const lignes = new Map<string, LigneResultats>();
  let numero = 0;
  const identifiantFictif = (): string => {
    numero += 1;
    return `apercu-${String(numero)}`;
  };
  for (const recue of paquet.evaluations) {
    const preparation = preparer(locales.get(recue.modele.id), recue, promotions, paquet, catalogue, false, identifiantFictif);
    if (preparation !== null) {
      lignes.set(recue.modele.id, preparation.ligne);
    }
  }
  return lignes;
}

/**
 * Applique les résultats d'étudiants des évaluations choisies.
 *
 * À appeler après l'application du plan des évaluations : une évaluation du
 * fichier absente d'ici (non créée) est ignorée. Les promotions sont
 * complétées ou créées au besoin ; aucun étudiant ni résultat d'ici n'est retiré.
 *
 * @param aRemplacer évaluations pour lesquelles les résultats différents du fichier remplacent ceux d'ici
 */
export function appliquerResultats(
  entrees: Entrees,
  paquet: Paquet,
  catalogue: readonly ReferentielLocal[],
  identifiantsChoisis: ReadonlySet<string>,
  aRemplacer: ReadonlySet<string>,
  genererIdentifiant: () => string,
): Entrees {
  let promotions = lirePromotionsBrutes(entrees[CLE_PROMOTIONS]);
  const recues = new Map(paquet.evaluations.map((recue) => [recue.modele.id, recue]));
  const modifiees = new Set<string>();
  const evaluations = lireEvaluationsBrutes(entrees).map((element): unknown => {
    if (!estEvaluation(element) || !identifiantsChoisis.has(element.id)) {
      return element;
    }
    const recue = recues.get(element.id);
    const preparation =
      recue === undefined
        ? null
        : preparer(element, recue, promotions, paquet, catalogue, aRemplacer.has(element.id), genererIdentifiant);
    if (preparation === null || preparation.champs === null) {
      return element;
    }
    promotions = preparation.promotions;
    modifiees.add(element.id);
    return { ...element, ...preparation.champs };
  });
  if (modifiees.size === 0) {
    return entrees;
  }
  return {
    ...entrees,
    [CLE_EVALUATIONS]: JSON.stringify(evaluations),
    [CLE_PROMOTIONS]: JSON.stringify(promotions),
  };
}
