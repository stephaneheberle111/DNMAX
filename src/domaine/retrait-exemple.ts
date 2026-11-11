// SPDX-License-Identifier: AGPL-3.0-or-later
import { CLE_EVALUATIONS, CLE_PROMOTIONS, analyserJson, estEvaluation, estObjet } from "./echange/modele";
import { CLE_DATES_MODIFICATION, lireDatesModification } from "./echange/suivi-modifications";
import { ecrireJsonCanonique } from "./empreinte";
import type { Entrees } from "./magasin-memoire";

/** Clé du magasin où est gardé l'état d'avant et d'après le chargement de l'exemple. */
export const CLE_INSTANTANE_EXEMPLE = "dnmax.exemple";

/** Préfixe des clés tenues par l'interface historique : les seules que l'exemple modifie. */
const PREFIXE_DONNEES = "dnmade.";

/**
 * État des données juste avant et juste après le chargement de l'exemple.
 * Leur différence dit exactement ce que l'exemple a ajouté ou modifié.
 */
export interface InstantaneExemple {
  avant: Entrees;
  apres: Entrees;
}

function garderDonnees(entrees: Entrees): Entrees {
  return Object.fromEntries(Object.entries(entrees).filter(([cle]) => cle.startsWith(PREFIXE_DONNEES)));
}

function lireTextes(valeur: unknown): Entrees | null {
  if (!estObjet(valeur)) {
    return null;
  }
  const textes: Record<string, string> = {};
  for (const [cle, contenu] of Object.entries(valeur)) {
    if (typeof contenu === "string") {
      textes[cle] = contenu;
    }
  }
  return textes;
}

export function lireInstantane(texte: string | null | undefined): InstantaneExemple | null {
  const valeur = analyserJson(texte);
  const avant = estObjet(valeur) ? lireTextes(valeur.avant) : null;
  const apres = estObjet(valeur) ? lireTextes(valeur.apres) : null;
  return avant === null || apres === null ? null : { avant, apres };
}

/**
 * Compose l'instantané à enregistrer après un chargement de l'exemple.
 *
 * Si l'exemple avait déjà été chargé, l'état « avant » d'origine est conservé :
 * c'est à lui qu'il faudra revenir, pas à un état contenant déjà l'exemple.
 */
export function composerInstantane(avant: Entrees, apres: Entrees, existant: InstantaneExemple | null): InstantaneExemple {
  return { avant: existant?.avant ?? garderDonnees(avant), apres: garderDonnees(apres) };
}

function lireListe(texte: string | undefined): unknown[] {
  const valeur = analyserJson(texte);
  return Array.isArray(valeur) ? valeur : [];
}

function identifiants(liste: readonly unknown[]): Set<string> {
  return new Set(liste.filter(estEvaluation).map((element) => element.id));
}

function indexer(liste: readonly unknown[]): Map<string, unknown> {
  return new Map(liste.filter(estEvaluation).map((element) => [element.id, element]));
}

export interface BilanRetrait {
  evaluationsRetirees: number;
  promotionsRetirees: number;
  /** Promotions de l'exemple gardées parce qu'une de vos évaluations s'y rattache. */
  promotionsGardees: number;
  /** Vrai si l'établissement ou le référentiel ont été modifiés depuis : ceux de l'exemple restent alors en place. */
  etablissementConserve: boolean;
}

/**
 * Retire ce que l'exemple a apporté, et seulement cela.
 *
 * - Les évaluations créées par l'exemple sont retirées, même retouchées depuis.
 * - Une promotion créée par l'exemple est retirée, sauf si une évaluation
 *   restante s'y rattache. Une promotion que l'exemple avait modifiée retrouve
 *   son état d'avant, sauf si elle a été modifiée depuis.
 * - Chaque autre donnée (établissement et référentiel, modules, brouillon…)
 *   retrouve son état d'avant si elle n'a pas bougé depuis le chargement ;
 *   sinon elle est laissée telle quelle, pour ne perdre aucun travail.
 * - Tout ce qui a été créé après le chargement est conservé.
 */
export function retirerExemple(entrees: Entrees, instantane: InstantaneExemple): { entrees: Entrees; bilan: BilanRetrait } {
  const { avant, apres } = instantane;
  const resultat: Record<string, string> = { ...entrees };
  // Suppression de clés connues, sur une copie.
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete resultat[CLE_INSTANTANE_EXEMPLE];

  // Évaluations : celles que l'exemple a créées.
  const evaluationsAvant = identifiants(lireListe(avant[CLE_EVALUATIONS]));
  const evaluationsExemple = new Set(
    [...identifiants(lireListe(apres[CLE_EVALUATIONS]))].filter((id) => !evaluationsAvant.has(id)),
  );
  const evaluations = lireListe(entrees[CLE_EVALUATIONS]);
  const evaluationsRestantes = evaluations.filter((element) => !(estEvaluation(element) && evaluationsExemple.has(element.id)));
  resultat[CLE_EVALUATIONS] = JSON.stringify(evaluationsRestantes);

  // Promotions.
  const promotionsAvant = indexer(lireListe(avant[CLE_PROMOTIONS]));
  const promotionsApres = indexer(lireListe(apres[CLE_PROMOTIONS]));
  const rattachements = new Set<unknown>();
  for (const evaluation of evaluationsRestantes.filter(estEvaluation)) {
    rattachements.add(evaluation.promoId);
    for (const classe of Array.isArray(evaluation.classes) ? evaluation.classes : []) {
      rattachements.add(classe);
    }
  }
  let promotionsRetirees = 0;
  let promotionsGardees = 0;
  const promotions: unknown[] = [];
  for (const promotion of lireListe(entrees[CLE_PROMOTIONS])) {
    if (!estEvaluation(promotion) || !promotionsApres.has(promotion.id)) {
      promotions.push(promotion);
      continue;
    }
    const inchangee = ecrireJsonCanonique(promotion) === ecrireJsonCanonique(promotionsApres.get(promotion.id));
    const dAvant = promotionsAvant.get(promotion.id);
    if (dAvant !== undefined) {
      promotions.push(inchangee ? dAvant : promotion);
    } else if (rattachements.has(promotion.id) || rattachements.has(promotion.nom)) {
      promotions.push(promotion);
      promotionsGardees += 1;
    } else {
      promotionsRetirees += 1;
    }
  }
  resultat[CLE_PROMOTIONS] = JSON.stringify(promotions);

  // Autres données : rétablies seulement si rien n'y a bougé depuis le chargement.
  let etablissementConserve = false;
  const autresCles = new Set([...Object.keys(avant), ...Object.keys(apres)]);
  autresCles.delete(CLE_EVALUATIONS);
  autresCles.delete(CLE_PROMOTIONS);
  for (const cle of autresCles) {
    if (avant[cle] === apres[cle]) {
      continue;
    }
    if (entrees[cle] !== apres[cle]) {
      etablissementConserve = true;
      continue;
    }
    const valeurAvant = avant[cle];
    if (valeurAvant === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete resultat[cle];
    } else {
      resultat[cle] = valeurAvant;
    }
  }

  // Les dates de modification des évaluations retirées n'ont plus lieu d'être.
  const dates = Object.fromEntries(
    Object.entries(lireDatesModification(entrees[CLE_DATES_MODIFICATION])).filter(([id]) => !evaluationsExemple.has(id)),
  );
  resultat[CLE_DATES_MODIFICATION] = JSON.stringify(dates);

  return {
    entrees: resultat,
    bilan: {
      evaluationsRetirees: evaluations.length - evaluationsRestantes.length,
      promotionsRetirees,
      promotionsGardees,
      etablissementConserve,
    },
  };
}
