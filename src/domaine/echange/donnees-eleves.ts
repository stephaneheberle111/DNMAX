// SPDX-License-Identifier: AGPL-3.0-or-later
import { ecrireJsonCanonique } from "../empreinte";
import { analyserJson, estObjet, type Evaluation, type ObjetJson } from "./modele";
import { normaliserNom } from "./referentiel";

/**
 * Champs d'une évaluation qui portent des données d'étudiants. Ils ne voyagent
 * que dans un fichier protégé par mot de passe.
 */
export const CHAMPS_ELEVES = ["res", "eleves", "eleveIds", "eleveId", "restit"] as const;

export interface Eleve {
  id: string;
  nom: string;
}

/** Une promotion telle qu'elle voyage : désignée par son diplôme et non par un identifiant local. */
export interface PromotionEchangee {
  id: string;
  nom: string;
  diplome: string;
  mention: string;
  /** Année d'entrée de la cohorte, ou `null` si elle est inconnue. */
  debut: number | null;
  eleves: Eleve[];
}

/** Les données d'étudiants d'une évaluation, avec la promotion à laquelle elles se rapportent. */
export interface DonneesEleves {
  /** Promotion de l'expéditeur ; texte vide pour une liste d'étudiants saisie à la main. */
  promotionId: string;
  champs: ObjetJson;
}

/** Préfixe des identifiants que l'interface historique donne aux étudiants d'une liste saisie à la main. */
const PREFIXE_ELEVE_LIBRE = "libre";

function lireEleves(liste: unknown): Eleve[] {
  if (!Array.isArray(liste)) {
    return [];
  }
  return liste
    .filter(estObjet)
    .filter((eleve) => typeof eleve.id === "string" && eleve.id !== "" && typeof eleve.nom === "string")
    .map((eleve) => ({ id: eleve.id as string, nom: eleve.nom as string }));
}

export function lirePromotionEchangee(valeur: unknown): PromotionEchangee | null {
  if (
    !estObjet(valeur) ||
    typeof valeur.id !== "string" ||
    valeur.id === "" ||
    typeof valeur.nom !== "string" ||
    typeof valeur.diplome !== "string" ||
    typeof valeur.mention !== "string"
  ) {
    return null;
  }
  return {
    id: valeur.id,
    nom: valeur.nom,
    diplome: valeur.diplome,
    mention: valeur.mention,
    debut: typeof valeur.debut === "number" ? valeur.debut : null,
    eleves: lireEleves(valeur.eleves),
  };
}

export function lireDonneesEleves(valeur: unknown): DonneesEleves | null {
  if (!estObjet(valeur) || typeof valeur.promotionId !== "string" || !estObjet(valeur.champs)) {
    return null;
  }
  const champs: ObjetJson = {};
  for (const champ of CHAMPS_ELEVES) {
    if (champ in valeur.champs) {
      champs[champ] = valeur.champs[champ];
    }
  }
  return { promotionId: valeur.promotionId, champs };
}

/** Extrait d'une évaluation ses données d'étudiants, pour un envoi protégé. */
export function extraireDonneesEleves(evaluation: Evaluation, promotionId: string): DonneesEleves {
  const champs: ObjetJson = {};
  for (const champ of CHAMPS_ELEVES) {
    if (champ in evaluation) {
      champs[champ] = evaluation[champ];
    }
  }
  return { promotionId, champs };
}

/** Lit une promotion enregistrée par l'interface historique, pour l'envoyer. */
export function decrirePromotion(brute: unknown, diplome: string, mention: string): PromotionEchangee | null {
  if (!estObjet(brute) || typeof brute.id !== "string" || brute.id === "") {
    return null;
  }
  return {
    id: brute.id,
    nom: typeof brute.nom === "string" ? brute.nom : "",
    diplome,
    mention,
    debut: typeof brute.debut === "number" ? brute.debut : null,
    eleves: lireEleves(brute.liste),
  };
}

/** Correspondance entre l'identifiant d'un étudiant chez l'expéditeur et son identifiant ici. */
export type Correspondances = ReadonlyMap<string, string>;

export interface Rapprochement {
  /** Liste des promotions à enregistrer (inchangée si rien n'était à faire). */
  promotions: unknown[];
  /** Identifiant, ici, de la promotion rapprochée. */
  promotionId: string;
  correspondances: Correspondances;
  /** Nombre d'étudiants de l'expéditeur absents d'ici, qui seraient ajoutés à la promotion. */
  elevesAjoutes: number;
  /** Vrai si la promotion n'existait pas ici et serait créée. */
  promotionCreee: boolean;
}

/**
 * Rapproche une promotion reçue des promotions d'ici, sans rien modifier en place.
 *
 * La promotion est retrouvée par son identifiant, sinon par son nom au sein
 * du même diplôme ; à défaut elle est créée. Chaque étudiant est retrouvé par son
 * identifiant, sinon par son nom (casse, accents et espaces ignorés) : deux
 * enseignants qui ont saisi la même classe chacun de leur côté se retrouvent
 * ainsi. Un étudiant inconnu est ajouté à la promotion ; aucun étudiant d'ici n'est
 * retiré ni renommé.
 *
 * @param diplomeIdLocal diplôme d'ici correspondant à celui de la promotion, ou `null` s'il n'existe pas
 * @returns `null` si la promotion n'existe pas ici et ne peut pas être créée faute de diplôme
 */
export function rapprocherPromotion(
  promotionsLocales: readonly unknown[],
  recue: PromotionEchangee,
  diplomeIdLocal: string | null,
  genererIdentifiant: () => string,
): Rapprochement | null {
  const indexParId = promotionsLocales.findIndex((locale) => estObjet(locale) && locale.id === recue.id);
  const indexParNom = promotionsLocales.findIndex(
    (locale) =>
      estObjet(locale) &&
      diplomeIdLocal !== null &&
      locale.diplomeId === diplomeIdLocal &&
      typeof locale.nom === "string" &&
      normaliserNom(locale.nom) === normaliserNom(recue.nom) &&
      normaliserNom(recue.nom) !== "",
  );
  const index = indexParId >= 0 ? indexParId : indexParNom;
  const existante = promotionsLocales[index];
  if (!estObjet(existante)) {
    if (diplomeIdLocal === null) {
      return null;
    }
    const creee = {
      id: recue.id,
      nom: recue.nom,
      diplomeId: diplomeIdLocal,
      ...(recue.debut === null ? {} : { debut: recue.debut }),
      liste: recue.eleves,
      eleves: recue.eleves.map((eleve) => eleve.nom).join("\n"),
    };
    return {
      promotions: [...promotionsLocales, creee],
      promotionId: recue.id,
      correspondances: new Map(recue.eleves.map((eleve) => [eleve.id, eleve.id])),
      elevesAjoutes: recue.eleves.length,
      promotionCreee: true,
    };
  }

  const liste = lireEleves(existante.liste);
  const correspondances = new Map<string, string>();
  let elevesAjoutes = 0;
  for (const eleve of recue.eleves) {
    const connu =
      liste.find((local) => local.id === eleve.id) ??
      liste.find((local) => normaliserNom(local.nom) === normaliserNom(eleve.nom) && normaliserNom(eleve.nom) !== "");
    if (connu !== undefined) {
      correspondances.set(eleve.id, connu.id);
      continue;
    }
    const ajoute = { id: genererIdentifiant(), nom: eleve.nom };
    liste.push(ajoute);
    correspondances.set(eleve.id, ajoute.id);
    elevesAjoutes += 1;
  }
  const promotions =
    elevesAjoutes === 0
      ? [...promotionsLocales]
      : promotionsLocales.map((locale, position): unknown =>
          position === index ? { ...existante, liste, eleves: liste.map((eleve) => eleve.nom).join("\n") } : locale,
        );
  return {
    promotions,
    promotionId: typeof existante.id === "string" ? existante.id : recue.id,
    correspondances,
    elevesAjoutes,
    promotionCreee: false,
  };
}

function lireNoms(texte: unknown): string[] {
  return typeof texte === "string"
    ? texte
        .split(/\r?\n/)
        .map((nom) => nom.trim())
        .filter((nom) => nom !== "")
    : [];
}

/**
 * Rapproche deux listes d'étudiants saisies à la main (un nom par ligne), où
 * l'interface historique identifie chaque étudiant par son rang : « libre0 »,
 * « libre1 »… Les noms inconnus d'ici sont ajoutés en fin de liste.
 */
export function rapprocherListeLibre(
  texteLocal: unknown,
  texteRecu: unknown,
): { texte: string; correspondances: Correspondances; elevesAjoutes: number } {
  const noms = lireNoms(texteLocal);
  const correspondances = new Map<string, string>();
  let elevesAjoutes = 0;
  lireNoms(texteRecu).forEach((nom, rangRecu) => {
    let rang = noms.findIndex((local) => normaliserNom(local) === normaliserNom(nom));
    if (rang < 0) {
      rang = noms.push(nom) - 1;
      elevesAjoutes += 1;
    }
    correspondances.set(`${PREFIXE_ELEVE_LIBRE}${String(rangRecu)}`, `${PREFIXE_ELEVE_LIBRE}${String(rang)}`);
  });
  return { texte: noms.join("\n"), correspondances, elevesAjoutes };
}

export interface BilanResultats {
  /** Étudiants du fichier sans résultat ici. */
  nouveaux: number;
  /** Étudiants dont les résultats du fichier diffèrent de ceux d'ici. */
  differents: number;
  identiques: number;
}

/**
 * Fusionne les résultats reçus dans ceux d'ici, étudiant par étudiant.
 *
 * Un étudiant sans résultat ici reçoit ceux du fichier. Un étudiant dont les
 * résultats diffèrent garde les siens, sauf si `remplacerDifferents` est
 * demandé. Un étudiant d'ici absent du fichier n'est jamais touché, et un étudiant
 * du fichier sans correspondance ici est ignoré.
 */
export function fusionnerResultats(
  resultatsLocaux: unknown,
  resultatsRecus: unknown,
  correspondances: Correspondances,
  remplacerDifferents: boolean,
): { resultats: ObjetJson; bilan: BilanResultats } {
  const resultats: ObjetJson = estObjet(resultatsLocaux) ? { ...resultatsLocaux } : {};
  const bilan: BilanResultats = { nouveaux: 0, differents: 0, identiques: 0 };
  for (const [idRecu, recu] of Object.entries(estObjet(resultatsRecus) ? resultatsRecus : {})) {
    const idLocal = correspondances.get(idRecu);
    if (idLocal === undefined) {
      continue;
    }
    if (!(idLocal in resultats)) {
      resultats[idLocal] = recu;
      bilan.nouveaux += 1;
    } else if (ecrireJsonCanonique(resultats[idLocal]) === ecrireJsonCanonique(recu)) {
      bilan.identiques += 1;
    } else {
      bilan.differents += 1;
      if (remplacerDifferents) {
        resultats[idLocal] = recu;
      }
    }
  }
  return { resultats, bilan };
}

/** Lit la liste brute des promotions enregistrées. */
export function lirePromotionsBrutes(texte: string | null | undefined): unknown[] {
  const valeur = analyserJson(texte);
  return Array.isArray(valeur) ? valeur : [];
}
