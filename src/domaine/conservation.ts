// SPDX-License-Identifier: AGPL-3.0-or-later
import { CLE_BROUILLON, effacerEleve } from "./droits-eleve";
import { CLE_DONNEES, CLE_EVALUATIONS, CLE_PROMOTIONS, analyserJson, estObjet, type ObjetJson } from "./echange/modele";
import { normaliserNom } from "./echange/referentiel";
import type { Entrees } from "./magasin-memoire";
import { CLE_INSTANTANE_EXEMPLE } from "./retrait-exemple";

/**
 * Durée de conservation des données d'élèves (RGPD : limitation de la conservation).
 *
 * Une promotion « sort » à la fin de l'année scolaire où s'achève son diplôme.
 * Ses données d'élèves sont échues quand la durée de conservation est passée
 * depuis cette sortie : DNMAX le rappelle et propose de les effacer ou de les
 * anonymiser, sans jamais le faire seul. Les évaluations elles-mêmes (grilles,
 * consignes) sont gardées.
 *
 * Un élève qui redouble change de promotion : déplacé, il garde son
 * identifiant et n'appartient plus à l'ancienne ; ressaisi, il figure dans les
 * deux, et c'est son nom, retrouvé dans une promotion encore en cours, qui le
 * signale. Il est alors proposé à garder.
 */

/** Durée d'un diplôme quand elle n'est pas renseignée (même règle que l'interface historique). */
const DUREE_DIPLOME_PAR_DEFAUT = 3;
/** Jour où une promotion est considérée comme sortie : lendemain de la fin de l'année scolaire. */
const JOUR_DE_SORTIE = "07-01";
/** Préfixe des identifiants d'élèves de promotion (« s » suivi d'un horodatage ou d'un tirage). */
const PREFIXE_ELEVE_PROMOTION = "s";
const PREFIXE_LIBRE = "libre";
/** Préfixe du nom donné à un élève anonymisé, suivi de son rang dans la promotion. */
export const NOM_ANONYME = "Élève anonyme";

/** Élève d'une promotion échue dont le nom figure aussi dans une promotion encore en cours. */
export interface RedoublantProbable {
  id: string;
  nom: string;
  /** Nom de la promotion en cours où son nom figure. */
  autrePromotion: string;
}

export interface PromotionEchue {
  id: string;
  nom: string;
  /** Date de sortie, AAAA-MM-JJ. */
  sortie: string;
  /** Date à partir de laquelle ses données d'élèves sont échues, AAAA-MM-JJ. */
  echeance: string;
  /** Élèves encore identifiables (les élèves déjà anonymisés ne comptent pas). */
  eleves: number;
  redoublants: RedoublantProbable[];
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

function elevesDe(promotion: ObjetJson): { id: string; nom: string }[] {
  return (Array.isArray(promotion.liste) ? promotion.liste : [])
    .filter(estObjet)
    .filter((eleve) => typeof eleve.id === "string" && eleve.id !== "")
    .map((eleve) => ({ id: eleve.id as string, nom: typeof eleve.nom === "string" ? eleve.nom : "" }));
}

function identifiantsEleves(promotion: ObjetJson): string[] {
  return elevesDe(promotion).map((eleve) => eleve.id);
}

function estAnonyme(nom: string): boolean {
  return nom.startsWith(`${NOM_ANONYME} `);
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

/** Une promotion qui compte encore des élèves identifiables, échue ou non. */
export interface EtatPromotion extends PromotionEchue {
  /** Vrai si sa durée de conservation est dépassée. */
  echue: boolean;
}

/**
 * Toutes les promotions qui comptent encore des élèves identifiables, avec
 * leurs dates et leurs redoublants probables : l'enseignant peut anonymiser
 * ou effacer une promotion à tout moment, pas seulement à l'échéance.
 *
 * Un redoublant probable est un élève dont le nom figure aussi dans une
 * promotion entrée plus tard. Une promotion sans année d'entrée n'a ni dates
 * (texte vide) ni redoublants, et n'est jamais échue.
 *
 * @param aujourdHui date du jour, AAAA-MM-JJ
 * @param anneesConservation années de conservation après la sortie
 */
export function etatPromotions(entrees: Entrees, aujourdHui: string, anneesConservation: number): EtatPromotion[] {
  const durees = dureesDiplomes(entrees);
  const promotions = lireListe(entrees[CLE_PROMOTIONS])
    .filter(estObjet)
    .filter((promotion): promotion is ObjetJson & { id: string } => typeof promotion.id === "string" && promotion.id !== "");
  return promotions.flatMap((promotion) => {
    // Un élève déjà anonymisé n'a plus rien à traiter.
    const identifiables = elevesDe(promotion).filter((eleve) => !estAnonyme(eleve.nom));
    if (identifiables.length === 0) {
      return [];
    }
    const debut = Number(promotion.debut);
    const connue = Number.isInteger(debut) && promotion.debut !== null && promotion.debut !== undefined && promotion.debut !== "";
    const duree = durees.get(texte(promotion.diplomeId)) ?? DUREE_DIPLOME_PAR_DEFAUT;
    const sortie = connue ? `${String(debut + duree)}-${JOUR_DE_SORTIE}` : "";
    const echeance = connue ? `${String(debut + duree + anneesConservation)}-${JOUR_DE_SORTIE}` : "";
    const plusRecentes = connue ? promotions.filter((autre) => autre.id !== promotion.id && Number(autre.debut) > debut) : [];
    const redoublants = identifiables.flatMap((eleve) => {
      const nom = normaliserNom(eleve.nom);
      const autre =
        nom === ""
          ? undefined
          : plusRecentes.find((candidate) => elevesDe(candidate).some((element) => normaliserNom(element.nom) === nom));
      return autre === undefined ? [] : [{ id: eleve.id, nom: eleve.nom, autrePromotion: texte(autre.nom) }];
    });
    return [
      {
        id: promotion.id,
        nom: texte(promotion.nom),
        sortie,
        echeance,
        eleves: identifiables.length,
        redoublants,
        echue: connue && aujourdHui >= echeance,
      },
    ];
  });
}

/**
 * Promotions dont les données d'élèves ont dépassé la durée de conservation,
 * avec leurs redoublants probables.
 */
export function promotionsEchues(entrees: Entrees, aujourdHui: string, anneesConservation: number): PromotionEchue[] {
  return etatPromotions(entrees, aujourdHui, anneesConservation)
    .filter((promotion) => promotion.echue)
    .map((promotion) => ({
      id: promotion.id,
      nom: promotion.nom,
      sortie: promotion.sortie,
      echeance: promotion.echeance,
      eleves: promotion.eleves,
      redoublants: promotion.redoublants,
    }));
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

function lireTextes(valeur: unknown): Entrees {
  return estObjet(valeur)
    ? Object.fromEntries(Object.entries(valeur).filter((paire): paire is [string, string] => typeof paire[1] === "string"))
    : {};
}

/**
 * Applique une transformation aux promotions, aux évaluations et au brouillon,
 * ainsi qu'aux copies gardées pour retirer l'exemple.
 */
function transformer(
  entrees: Entrees,
  promotion: (promotion: ObjetJson) => ObjetJson,
  evaluation: (evaluation: ObjetJson) => ObjetJson,
): Entrees {
  const appliquer = (donnees: Entrees): Record<string, string> => {
    const resultat: Record<string, string> = { ...donnees };
    if (CLE_PROMOTIONS in donnees) {
      resultat[CLE_PROMOTIONS] = JSON.stringify(
        lireListe(donnees[CLE_PROMOTIONS]).map((element): unknown => (estObjet(element) ? promotion(element) : element)),
      );
    }
    if (CLE_EVALUATIONS in donnees) {
      resultat[CLE_EVALUATIONS] = JSON.stringify(
        lireListe(donnees[CLE_EVALUATIONS]).map((element): unknown => (estObjet(element) ? evaluation(element) : element)),
      );
    }
    const brouillon = analyserJson(donnees[CLE_BROUILLON]);
    if (estObjet(brouillon)) {
      resultat[CLE_BROUILLON] = JSON.stringify(evaluation(brouillon));
    }
    return resultat;
  };
  const resultat = appliquer(entrees);
  const instantane = analyserJson(entrees[CLE_INSTANTANE_EXEMPLE]);
  if (estObjet(instantane)) {
    resultat[CLE_INSTANTANE_EXEMPLE] = JSON.stringify({
      avant: appliquer(lireTextes(instantane.avant)),
      apres: appliquer(lireTextes(instantane.apres)),
    });
  }
  return resultat;
}

/**
 * Dans les évaluations rattachées à ces promotions, retire la liste d'élèves
 * saisie à la main et ses résultats : l'interface historique ne s'en sert plus
 * dès qu'une promotion est choisie, mais les noms y restent écrits.
 */
function sansListeSaisie(evaluation: ObjetJson, promotions: ObjetJson[]): ObjetJson {
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
}

/** Champs de résultat en texte libre, qui peuvent identifier un élève. */
const CHAMPS_TEXTE_LIBRE = ["appr", "obs"];

function sansTexteLibre(resultat: unknown): unknown {
  if (!estObjet(resultat)) {
    return resultat;
  }
  return Object.fromEntries(Object.entries(resultat).filter(([champ]) => !CHAMPS_TEXTE_LIBRE.includes(champ)));
}

/** Effacer : retirer toute trace. Anonymiser : garder les niveaux sans rien qui identifie l'élève. */
export type Traitement = "effacer" | "anonymiser";

export interface ChoixConservation {
  /** Promotions échues à traiter. */
  promotions: readonly string[];
  /** Élèves à garder tels quels, par exemple un redoublant. */
  gardes: readonly string[];
  /** Traiter aussi les résultats restés sans élève. */
  orphelins: boolean;
  traitement: Traitement;
}

export interface BilanConservation {
  /** Élèves traités, ceux des promotions et les identifiants orphelins confondus. */
  eleves: number;
}

/**
 * Efface ou anonymise les données d'élèves des promotions choisies, sauf les
 * élèves gardés, et si demandé les résultats orphelins.
 *
 * - Effacer : l'élève quitte la promotion, ses résultats quittent les évaluations.
 * - Anonymiser : l'élève devient « Élève anonyme <n> » ; ses niveaux et ses
 *   dates restent, utiles aux bilans ; ses observations et son appréciation,
 *   textes libres qui peuvent l'identifier, sont retirées.
 *
 * Dans les deux cas, les listes saisies à la main restées écrites dans les
 * évaluations rattachées sont vidées, et les évaluations elles-mêmes gardées.
 */
export function traiterDonneesEchues(entrees: Entrees, choix: ChoixConservation): { entrees: Entrees; bilan: BilanConservation } {
  const gardes = new Set(choix.gardes);
  const choisies = lireListe(entrees[CLE_PROMOTIONS])
    .filter(estObjet)
    .filter((promotion) => typeof promotion.id === "string" && choix.promotions.includes(promotion.id));
  const desPromotions = choisies.flatMap(identifiantsEleves).filter((id) => !gardes.has(id));
  const orphelins = choix.orphelins ? identifiantsOrphelins(entrees).filter((id) => !gardes.has(id)) : [];
  const traites = new Set([...desPromotions, ...orphelins]);
  if (traites.size === 0 && choisies.length === 0) {
    return { entrees, bilan: { eleves: 0 } };
  }
  let resultat: Entrees = entrees;
  if (choix.traitement === "effacer") {
    if (traites.size > 0) {
      resultat = effacerEleve(resultat, { cle: "", nom: "", identifiants: [...traites], promotions: [] }, { parNom: false }).entrees;
    }
    resultat = transformer(
      resultat,
      (promotion) => promotion,
      (evaluation) => sansListeSaisie(evaluation, choisies),
    );
  } else {
    const idsChoisies = new Set(choisies.map((promotion) => promotion.id));
    resultat = transformer(
      resultat,
      (promotion) => {
        if (!idsChoisies.has(promotion.id)) {
          return promotion;
        }
        // La numérotation reprend après les élèves déjà anonymisés, pour ne pas créer de doublon.
        let rang = Math.max(
          0,
          ...elevesDe(promotion)
            .filter((eleve) => estAnonyme(eleve.nom))
            .map((eleve) => Number(eleve.nom.slice(NOM_ANONYME.length + 1)) || 0),
        );
        const liste = (Array.isArray(promotion.liste) ? promotion.liste : []).map((eleve): unknown => {
          if (!estObjet(eleve) || typeof eleve.id !== "string" || !traites.has(eleve.id) || estAnonyme(texte(eleve.nom))) {
            return eleve;
          }
          rang += 1;
          // Prénom et nom saisis à part sont remplacés aussi : rien ne doit rester du vrai nom.
          const anonyme = `${NOM_ANONYME} ${String(rang)}`;
          return { ...eleve, nom: anonyme, prenom: "", nomFam: anonyme };
        });
        const noms = liste.filter(estObjet).map((eleve) => texte(eleve.nom));
        return { ...promotion, liste, eleves: noms.join("\n") };
      },
      (evaluation) => {
        const copie = sansListeSaisie(evaluation, choisies);
        if (!estObjet(copie.res)) {
          return copie;
        }
        const resultats = Object.fromEntries(
          Object.entries(copie.res).map(([id, valeur]) => [id, traites.has(id) ? sansTexteLibre(valeur) : valeur]),
        );
        return { ...copie, res: resultats };
      },
    );
  }
  return { entrees: resultat, bilan: { eleves: traites.size } };
}
