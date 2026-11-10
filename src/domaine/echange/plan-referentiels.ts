// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entrees } from "../magasin-memoire";
import { CLE_DONNEES, analyserJson } from "./modele";
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
  integrerVersion,
  type Differences,
  type Partie,
  type ReferentielEchange,
} from "./referentiel-echange";

/** `ajouter` : nouvelle version proposée · `aucune` : déjà présent · `impossible` : diplôme absent d'ici. */
export type ActionReferentiel = "ajouter" | "aucune" | "impossible";

/** Ce que l'import ferait d'un référentiel du fichier. */
export interface LigneReferentiel {
  /** Clé de la ligne dans le plan (diplôme, mention et empreinte). */
  identifiant: string;
  diplome: string;
  mention: string;
  dateVersion: string;
  action: ActionReferentiel;
  /** Diplôme local qui recevrait la version ; texte vide si l'action est impossible. */
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
      comparaison.etat === "identique" ? "aucune" : diplomeLocal === undefined ? "impossible" : "ajouter";
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

/** Ce qu'il faut connaître du moment de l'import pour créer les versions. */
export interface ContexteImport {
  /** Date du jour (AAAA-MM-JJ), retenue pour une version reçue sans date. */
  dateDuJour: string;
  /** Note inscrite sur chaque version créée, pour dire d'où elle vient. */
  note: string;
  genererIdentifiant: (partie: Partie | "version") => string;
}

/**
 * Ajoute les référentiels choisis comme nouvelles versions non activées.
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
    if (ligne.action !== "ajouter" || !identifiantsChoisis.has(ligne.identifiant) || versionsCreees.has(ligne.identifiant)) {
      continue;
    }
    const version = {
      id: contexte.genererIdentifiant("version"),
      date: ligne.dateVersion || contexte.dateDuJour,
      note: contexte.note,
    };
    const apres = integrerVersion(donnees, ligne.diplomeId, ligne.recu, version, contexte.genererIdentifiant);
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
