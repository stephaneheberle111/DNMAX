// SPDX-License-Identifier: AGPL-3.0-or-later
import { CLE_EVALUATIONS, CLE_PROMOTIONS, analyserJson, estObjet, type ObjetJson } from "./echange/modele";
import { normaliserNom } from "./echange/referentiel";
import type { Entrees } from "./magasin-memoire";
import { CLE_INSTANTANE_EXEMPLE } from "./retrait-exemple";

/**
 * Droits d'un élève sur ses données (RGPD, articles 15 et 17) : retrouver tout
 * ce qui le concerne, le lui remettre, l'effacer partout.
 *
 * Un élève vit à plusieurs endroits des données de l'interface historique :
 * - dans la liste d'une promotion (`liste`, et sa copie texte `eleves`), sous un identifiant ;
 * - dans les évaluations et le brouillon : résultats `res` indexés par cet
 *   identifiant, élèves visés `eleveIds`, et liste saisie à la main `eleves`
 *   (un nom par ligne), dont les élèves sont identifiés par leur rang : « libre0 »…
 * - dans l'instantané gardé pour retirer l'exemple, qui copie tout cela.
 */

/** Clé du brouillon de l'interface historique : une évaluation complète en cours d'édition. */
export const CLE_BROUILLON = "dnmade.draft";

const PREFIXE_LIBRE = "libre";

/** Un élève tel que proposé à l'enseignant. */
export interface EleveRepere {
  /** Clé stable du repère : identifiant de promotion, ou nom normalisé pour un élève saisi à la main. */
  cle: string;
  nom: string;
  /** Identifiants de l'élève dans les promotions (vide pour un élève saisi à la main seulement). */
  identifiants: string[];
  /** Noms des promotions où il figure. */
  promotions: string[];
}

function lireListe(texte: string | undefined): unknown[] {
  const valeur = analyserJson(texte);
  return Array.isArray(valeur) ? valeur : [];
}

function lireNoms(texte: unknown): string[] {
  return typeof texte === "string" ? texte.split(/\r?\n/).map((nom) => nom.trim()) : [];
}

function elevesDePromotion(promotion: ObjetJson): { id: string; nom: string }[] {
  return (Array.isArray(promotion.liste) ? promotion.liste : [])
    .filter(estObjet)
    .filter((eleve) => typeof eleve.id === "string" && eleve.id !== "" && typeof eleve.nom === "string")
    .map((eleve) => ({ id: eleve.id as string, nom: eleve.nom as string }));
}

function evaluationsEtBrouillon(entrees: Entrees): ObjetJson[] {
  const evaluations = lireListe(entrees[CLE_EVALUATIONS]).filter(estObjet);
  const brouillon = analyserJson(entrees[CLE_BROUILLON]);
  return estObjet(brouillon) ? [...evaluations, brouillon] : evaluations;
}

/**
 * Liste les élèves présents dans les données : ceux des promotions, puis ceux
 * qui n'apparaissent que dans une liste saisie à la main. Triés par nom.
 */
export function listerEleves(entrees: Entrees): EleveRepere[] {
  const reperes: EleveRepere[] = [];
  const nomsConnus = new Set<string>();
  for (const promotion of lireListe(entrees[CLE_PROMOTIONS]).filter(estObjet)) {
    const nomPromotion = typeof promotion.nom === "string" ? promotion.nom : "";
    for (const eleve of elevesDePromotion(promotion)) {
      reperes.push({ cle: eleve.id, nom: eleve.nom, identifiants: [eleve.id], promotions: [nomPromotion] });
      nomsConnus.add(normaliserNom(eleve.nom));
    }
  }
  for (const evaluation of evaluationsEtBrouillon(entrees)) {
    for (const nom of lireNoms(evaluation.eleves)) {
      const normalise = normaliserNom(nom);
      if (normalise !== "" && !nomsConnus.has(normalise)) {
        nomsConnus.add(normalise);
        reperes.push({ cle: `nom:${normalise}`, nom, identifiants: [], promotions: [] });
      }
    }
  }
  return reperes.sort((premier, second) => premier.nom.localeCompare(second.nom, "fr"));
}

/** Rangs, dans la liste saisie à la main d'une évaluation, des lignes qui portent ce nom. */
function rangsDuNom(evaluation: ObjetJson, nomNormalise: string): number[] {
  if (nomNormalise === "") {
    return [];
  }
  return lireNoms(evaluation.eleves).flatMap((nom, rang) => (normaliserNom(nom) === nomNormalise ? [rang] : []));
}

/** Identifiants sous lesquels l'élève figure dans cette évaluation. */
function identifiantsDans(evaluation: ObjetJson, eleve: EleveRepere): string[] {
  const libres = rangsDuNom(evaluation, normaliserNom(eleve.nom)).map((rang) => `${PREFIXE_LIBRE}${String(rang)}`);
  return [...eleve.identifiants, ...libres];
}

export interface ExtraitEleve {
  format: "dnmax-donnees-eleve";
  version: 1;
  /** Date de l'extraction, AAAA-MM-JJ. */
  extraitLe: string;
  eleve: { nom: string; promotions: string[] };
  evaluations: {
    titre: string;
    semestre: string;
    classes: string[];
    /** Résultats tels qu'enregistrés : niveaux et pourcentages par compétence, observations, appréciation, dates. */
    resultats: unknown;
  }[];
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

/**
 * Rassemble tout ce qui concerne un élève dans les évaluations enregistrées
 * (le brouillon n'est pas une évaluation remise : il n'y figure pas).
 *
 * @param aujourdHui date de l'extraction, AAAA-MM-JJ
 */
export function extraireEleve(entrees: Entrees, eleve: EleveRepere, aujourdHui: string): ExtraitEleve {
  const evaluations: ExtraitEleve["evaluations"] = [];
  for (const evaluation of lireListe(entrees[CLE_EVALUATIONS]).filter(estObjet)) {
    const resultats = estObjet(evaluation.res) ? evaluation.res : {};
    const trouves = identifiantsDans(evaluation, eleve).filter((id) => id in resultats);
    for (const id of trouves) {
      evaluations.push({
        titre: texte(evaluation.titre),
        semestre: texte(evaluation.semestre),
        classes: (Array.isArray(evaluation.classes) ? evaluation.classes : []).filter((classe) => typeof classe === "string"),
        resultats: resultats[id],
      });
    }
  }
  return {
    format: "dnmax-donnees-eleve",
    version: 1,
    extraitLe: aujourdHui,
    eleve: { nom: eleve.nom, promotions: eleve.promotions },
    evaluations,
  };
}

export interface BilanEffacement {
  /** Promotions d'où l'élève est retiré. */
  promotions: number;
  /** Évaluations (brouillon compris) d'où ses résultats sont retirés. */
  evaluations: number;
  /** Listes saisies à la main d'où son nom est retiré. */
  listesSaisies: number;
}

/** Retire de la liste saisie à la main les rangs donnés, et renumérote les « libre<n> » suivants. */
function retirerRangs(evaluation: ObjetJson, rangs: number[]): ObjetJson {
  if (rangs.length === 0) {
    return evaluation;
  }
  const retires = new Set(rangs);
  const nouveauRang = (ancien: number): number | null =>
    retires.has(ancien) ? null : ancien - rangs.filter((rang) => rang < ancien).length;
  const renommer = (id: string): string | null => {
    if (!id.startsWith(PREFIXE_LIBRE)) {
      return id;
    }
    const ancien = Number(id.slice(PREFIXE_LIBRE.length));
    if (!Number.isInteger(ancien)) {
      return id;
    }
    const rang = nouveauRang(ancien);
    return rang === null ? null : `${PREFIXE_LIBRE}${String(rang)}`;
  };
  const copie: ObjetJson = { ...evaluation };
  copie.eleves = lireNoms(evaluation.eleves)
    .filter((_, rang) => !retires.has(rang))
    .join("\n");
  if (estObjet(evaluation.res)) {
    const resultats: ObjetJson = {};
    for (const [id, valeur] of Object.entries(evaluation.res)) {
      const nouveau = renommer(id);
      if (nouveau !== null) {
        resultats[nouveau] = valeur;
      }
    }
    copie.res = resultats;
  }
  if (Array.isArray(evaluation.eleveIds)) {
    copie.eleveIds = evaluation.eleveIds.flatMap((id: unknown) => {
      if (typeof id !== "string") {
        return [id];
      }
      const nouveau = renommer(id);
      return nouveau === null ? [] : [nouveau];
    });
  }
  return copie;
}

/** Façon de retrouver l'élève : par identifiant seulement, ou aussi par son nom dans les listes saisies à la main. */
export interface OptionsEffacement {
  parNom: boolean;
}

function effacerDansEvaluation(
  evaluation: ObjetJson,
  eleve: EleveRepere,
  bilan: BilanEffacement,
  options: OptionsEffacement,
): ObjetJson {
  const identifiants = new Set(eleve.identifiants);
  let copie: ObjetJson = { ...evaluation };
  let touchee = false;
  if (estObjet(evaluation.res) && eleve.identifiants.some((id) => id in (evaluation.res as ObjetJson))) {
    copie.res = Object.fromEntries(Object.entries(evaluation.res).filter(([id]) => !identifiants.has(id)));
    touchee = true;
  }
  if (Array.isArray(evaluation.eleveIds) && evaluation.eleveIds.some((id) => identifiants.has(id as string))) {
    copie.eleveIds = evaluation.eleveIds.filter((id) => !identifiants.has(id as string));
    touchee = true;
  }
  if ("eleveId" in evaluation && identifiants.has(evaluation.eleveId as string)) {
    delete copie.eleveId;
    touchee = true;
  }
  const rangs = options.parNom ? rangsDuNom(evaluation, normaliserNom(eleve.nom)) : [];
  if (rangs.length > 0) {
    copie = retirerRangs(copie, rangs);
    bilan.listesSaisies += 1;
    touchee = true;
  }
  if (touchee) {
    bilan.evaluations += 1;
  }
  return copie;
}

function effacerDansDonnees(entrees: Entrees, eleve: EleveRepere, bilan: BilanEffacement, options: OptionsEffacement): Entrees {
  const resultat: Record<string, string> = { ...entrees };
  const identifiants = new Set(eleve.identifiants);
  if (CLE_PROMOTIONS in entrees) {
    const promotions = lireListe(entrees[CLE_PROMOTIONS]).map((promotion): unknown => {
      if (!estObjet(promotion)) {
        return promotion;
      }
      const liste = elevesDePromotion(promotion);
      const restants = liste.filter((element) => !identifiants.has(element.id));
      if (restants.length === liste.length) {
        return promotion;
      }
      bilan.promotions += 1;
      return { ...promotion, liste: restants, eleves: restants.map((element) => element.nom).join("\n") };
    });
    resultat[CLE_PROMOTIONS] = JSON.stringify(promotions);
  }
  if (CLE_EVALUATIONS in entrees) {
    const evaluations = lireListe(entrees[CLE_EVALUATIONS]).map((evaluation): unknown =>
      estObjet(evaluation) ? effacerDansEvaluation(evaluation, eleve, bilan, options) : evaluation,
    );
    resultat[CLE_EVALUATIONS] = JSON.stringify(evaluations);
  }
  const brouillon = analyserJson(entrees[CLE_BROUILLON]);
  if (estObjet(brouillon)) {
    resultat[CLE_BROUILLON] = JSON.stringify(effacerDansEvaluation(brouillon, eleve, bilan, options));
  }
  return resultat;
}

function lireTextes(valeur: unknown): Entrees {
  return estObjet(valeur)
    ? Object.fromEntries(Object.entries(valeur).filter((paire): paire is [string, string] => typeof paire[1] === "string"))
    : {};
}

/**
 * Efface un élève de toutes les données : promotions, évaluations, brouillon,
 * et les copies gardées pour retirer l'exemple. Le reste est inchangé.
 *
 * Limites : un nom cité dans un texte libre (appréciation d'un autre élève,
 * titre, consignes) n'est pas recherché ; les sauvegardes automatiques du
 * coffre conservent l'élève jusqu'à leur renouvellement.
 *
 * @param options par défaut, l'élève est aussi retrouvé par son nom dans les
 *   listes saisies à la main ; un effacement en masse s'en tient aux identifiants.
 */
export function effacerEleve(
  entrees: Entrees,
  eleve: EleveRepere,
  options: OptionsEffacement = { parNom: true },
): { entrees: Entrees; bilan: BilanEffacement } {
  const bilan: BilanEffacement = { promotions: 0, evaluations: 0, listesSaisies: 0 };
  const resultat: Record<string, string> = { ...effacerDansDonnees(entrees, eleve, bilan, options) };
  const instantane = analyserJson(entrees[CLE_INSTANTANE_EXEMPLE]);
  if (estObjet(instantane)) {
    // Les copies ne comptent pas dans le bilan : l'enseignant ne les voit pas.
    const ignore: BilanEffacement = { promotions: 0, evaluations: 0, listesSaisies: 0 };
    resultat[CLE_INSTANTANE_EXEMPLE] = JSON.stringify({
      avant: effacerDansDonnees(lireTextes(instantane.avant), eleve, ignore, options),
      apres: effacerDansDonnees(lireTextes(instantane.apres), eleve, ignore, options),
    });
  }
  return { entrees: resultat, bilan };
}
