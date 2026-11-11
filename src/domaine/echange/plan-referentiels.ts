// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entrees } from "../magasin-memoire";
import { lirePromotionsBrutes } from "./donnees-eleves";
import { CLE_DONNEES, CLE_PROMOTIONS, analyserJson, estObjet } from "./modele";
import type { Paquet } from "./paquet";
import type { LignePlan } from "./plan";
import {
  comparerBase,
  normaliserNom,
  trouverReferentielDeReference,
  type BaseReferentiel,
  type ReferentielLocal,
} from "./referentiel";
import {
  comparerContenus,
  creerDiplome,
  integrerVersion,
  trouverDiplomeVierge,
  type Differences,
  type Partie,
  type ReferentielEchange,
} from "./referentiel-echange";

/**
 * `ajouter` : nouvelle version proposée pour un diplôme d'ici · `aucune` : déjà présent ·
 * `creer-diplome` : le diplôme n'existe pas ici, il serait créé avec ce référentiel.
 */
export type ActionReferentiel = "ajouter" | "aucune" | "creer-diplome";

/** Ce que l'import ferait d'un référentiel du fichier. */
export interface LigneReferentiel {
  /** Clé de la ligne dans le plan (diplôme, mention et empreinte). */
  identifiant: string;
  diplome: string;
  mention: string;
  dateVersion: string;
  action: ActionReferentiel;
  /** Diplôme local qui recevrait la version ; texte vide s'il n'y en a pas. */
  diplomeId: string;
  /** Écarts avec le référentiel de référence d'ici (action « ajouter » seulement). */
  differences: Differences | null;
  recu: ReferentielEchange;
}

/** Désigne un référentiel sans identifiant local : même clé chez l'expéditeur et le destinataire. */
export function cleDeBase(base: BaseReferentiel): string {
  return `${normaliserNom(base.diplome)}|${normaliserNom(base.mention)}|${base.empreinte}`;
}

/** Calcule ce que l'import ferait des référentiels du fichier, sans rien modifier. */
export function calculerPlanReferentiels(paquet: Paquet, catalogue: readonly ReferentielLocal[]): LigneReferentiel[] {
  return paquet.referentiels.map((recu) => {
    const comparaison = comparerBase(recu, catalogue);
    const diplomeLocal = catalogue.find(
      (local) =>
        normaliserNom(local.diplome) === normaliserNom(recu.diplome) &&
        normaliserNom(local.mention) === normaliserNom(recu.mention),
    );
    const action: ActionReferentiel =
      comparaison.etat === "identique" ? "aucune" : diplomeLocal === undefined ? "creer-diplome" : "ajouter";
    const reference = diplomeLocal === undefined ? null : trouverReferentielDeReference(catalogue, diplomeLocal.diplomeId);
    return {
      identifiant: cleDeBase(recu),
      diplome: recu.diplome,
      mention: recu.mention,
      dateVersion: recu.dateVersion,
      action,
      diplomeId: action === "ajouter" ? (diplomeLocal?.diplomeId ?? "") : "",
      differences: action === "ajouter" ? comparerContenus(reference?.contenu, recu.contenuLisible) : null,
      recu,
    };
  });
}

function diplomesDesPromotions(entrees: Entrees): Set<string> {
  return new Set(
    lirePromotionsBrutes(entrees[CLE_PROMOTIONS])
      .filter(estObjet)
      .map((promotion) => promotion.diplomeId)
      .filter((diplomeId) => typeof diplomeId === "string"),
  );
}

/** Ce qu'il faut connaître du moment de l'import pour créer les versions. */
export interface ContexteImport {
  /** Date du jour (AAAA-MM-JJ), retenue pour une version reçue sans date. */
  dateDuJour: string;
  /** Note inscrite sur chaque version créée, pour dire d'où elle vient. */
  note: string;
  genererIdentifiant: (partie: Partie | "version" | "diplome") => string;
}

/**
 * Ajoute les référentiels choisis : comme nouvelles versions non activées
 * pour les diplômes d'ici, ou en créant leur diplôme quand il n'existe pas.
 *
 * Rend les entrées à enregistrer et, pour chaque référentiel ajouté,
 * l'identifiant de la version créée (par clé de base), afin d'y rattacher
 * les évaluations reçues dans le même fichier.
 */
export function appliquerReferentiels(
  entrees: Entrees,
  lignes: readonly LigneReferentiel[],
  identifiantsChoisis: ReadonlySet<string>,
  contexte: ContexteImport,
): { entrees: Entrees; versionsCreees: Map<string, string> } {
  let donnees = analyserJson(entrees[CLE_DONNEES]);
  const versionsCreees = new Map<string, string>();
  for (const ligne of lignes) {
    if (ligne.action === "aucune" || !identifiantsChoisis.has(ligne.identifiant) || versionsCreees.has(ligne.identifiant)) {
      continue;
    }
    const version = {
      id: contexte.genererIdentifiant("version"),
      date: ligne.dateVersion || contexte.dateDuJour,
      note: contexte.note,
    };
    const apres =
      ligne.action === "ajouter"
        ? integrerVersion(donnees, ligne.diplomeId, ligne.recu, version, contexte.genererIdentifiant)
        : creerDiplome(
            donnees,
            ligne.recu,
            version,
            trouverDiplomeVierge(donnees, diplomesDesPromotions(entrees)),
            contexte.genererIdentifiant,
          );
    if (apres !== null) {
      donnees = apres;
      versionsCreees.set(ligne.identifiant, version.id);
    }
  }
  if (versionsCreees.size === 0) {
    return { entrees, versionsCreees };
  }
  return { entrees: { ...entrees, [CLE_DONNEES]: JSON.stringify(donnees) }, versionsCreees };
}

/**
 * Rattache les évaluations du plan aux versions qui viennent d'être créées :
 * une évaluation dont le référentiel était « différent » devient construite
 * sur un référentiel présent ici.
 */
export function rattacherAuxVersionsCreees(
  lignes: readonly LignePlan[],
  versionsCreees: ReadonlyMap<string, string>,
): LignePlan[] {
  return lignes.map((ligne) => {
    const versionId = ligne.recue.base === null ? undefined : versionsCreees.get(cleDeBase(ligne.recue.base));
    return versionId === undefined ? ligne : { ...ligne, referentiel: { etat: "identique", versionId } };
  });
}
