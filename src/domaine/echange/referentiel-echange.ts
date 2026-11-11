// SPDX-License-Identifier: AGPL-3.0-or-later
import { ecrireJsonCanonique } from "../empreinte";
import { estObjet, type ObjetJson } from "./modele";
import { retirerHorsContenu, type BaseReferentiel } from "./referentiel";

/** Les quatre listes d'un référentiel, dans l'ordre où leurs renvois se résolvent. */
export const PARTIES = ["ues", "ecs", "blocs", "competences"] as const;
export type Partie = (typeof PARTIES)[number];

/** Un élément de référentiel ou de dictionnaire : seul son identifiant est exigé. */
export type Element = ObjetJson & { id: string };
export type Listes = Record<Partie, Element[]>;

/**
 * Un référentiel tel qu'il voyage dans un fichier d'échange.
 *
 * L'interface historique range un référentiel en deux morceaux : sa
 * `structure` (qui est rattaché à quoi, sur quels semestres), dont les
 * éléments renvoient par identifiant à un `dictionnaire` de libellés commun à
 * tous les diplômes. Les deux voyagent ensemble, avec le `contenuLisible` qui
 * sert à montrer les différences.
 */
export interface ReferentielEchange extends BaseReferentiel {
  structure: Listes;
  dictionnaire: Listes;
  contenuLisible: unknown;
}

/** Champs du dictionnaire qui font l'identité d'un élément (les couleurs n'en font pas partie). */
const CHAMPS_IDENTITE: Record<Partie, readonly string[]> = {
  ues: ["nom", "code"],
  ecs: ["nom"],
  blocs: ["num", "nom"],
  competences: ["code", "libelle"],
};

function estElement(valeur: unknown): valeur is Element {
  return estObjet(valeur) && typeof valeur.id === "string" && valeur.id !== "";
}

/** Lit quatre listes d'éléments ; rend `null` si la forme n'est pas celle attendue. */
export function lireListes(valeur: unknown): Listes | null {
  if (!estObjet(valeur)) {
    return null;
  }
  const listes: Listes = { ues: [], ecs: [], blocs: [], competences: [] };
  for (const partie of PARTIES) {
    const liste = valeur[partie];
    if (!Array.isArray(liste) || !liste.every(estElement)) {
      return null;
    }
    listes[partie] = liste;
  }
  return listes;
}

function cloner<Type>(valeur: Type): Type {
  return JSON.parse(JSON.stringify(valeur)) as Type;
}

/**
 * Prépare l'envoi d'un référentiel : sa structure, et les seuls libellés du
 * dictionnaire qu'elle utilise.
 *
 * @param structure la version validée à envoyer, ou le référentiel de travail
 * @param dictionnaire le dictionnaire complet du poste
 * @returns `null` si la structure ou le dictionnaire sont inutilisables
 */
export function preparerEnvoi(
  base: BaseReferentiel,
  structure: unknown,
  dictionnaire: unknown,
  contenuLisible: unknown,
): ReferentielEchange | null {
  const listes = lireListes(structure);
  const libelles = lireListes(dictionnaire);
  if (listes === null || libelles === null) {
    return null;
  }
  const utiles: Listes = { ues: [], ecs: [], blocs: [], competences: [] };
  for (const partie of PARTIES) {
    const identifiants = new Set(listes[partie].map((element) => element.id));
    utiles[partie] = libelles[partie].filter((element) => identifiants.has(element.id));
  }
  return { ...base, structure: cloner(listes), dictionnaire: cloner(utiles), contenuLisible: retirerHorsContenu(contenuLisible) };
}

function identiteDe(partie: Partie, element: Element): string {
  return ecrireJsonCanonique(CHAMPS_IDENTITE[partie].map((champ) => element[champ] ?? ""));
}

/** Remplace, dans un élément de structure, les identifiants qui ont changé à l'intégration. */
function reecrireRenvois(partie: Partie, element: Element, renvois: Record<Partie, Map<string, string>>): Element {
  const reecrit: Element = { ...element, id: renvois[partie].get(element.id) ?? element.id };
  if (partie === "ecs" && typeof element.ueId === "string") {
    reecrit.ueId = renvois.ues.get(element.ueId) ?? element.ueId;
  }
  if (partie === "competences" && Array.isArray(element.ecs)) {
    reecrit.ecs = element.ecs.map((lien: unknown): unknown =>
      estObjet(lien) && typeof lien.id === "string" ? { ...lien, id: renvois.ecs.get(lien.id) ?? lien.id } : lien,
    );
  }
  return reecrit;
}

export interface NouvelleVersion {
  id: string;
  date: string;
  note: string;
}

/**
 * Fait entrer les libellés reçus dans le dictionnaire du poste et rend la
 * structure reçue, réécrite pour y renvoyer. Voir `integrerVersion` pour les
 * règles ; aucun libellé local n'est modifié.
 */
function integrerLibelles(
  dictionnaireLocal: Listes,
  recu: ReferentielEchange,
  genererIdentifiant: (partie: Partie) => string,
): { dictionnaire: Listes; structure: Listes } {
  const dictionnaire = cloner(dictionnaireLocal);
  const renvois: Record<Partie, Map<string, string>> = {
    ues: new Map(),
    ecs: new Map(),
    blocs: new Map(),
    competences: new Map(),
  };
  for (const partie of PARTIES) {
    for (const libelle of recu.dictionnaire[partie]) {
      const identite = identiteDe(partie, libelle);
      const memeIdentifiant = dictionnaire[partie].find((local) => local.id === libelle.id);
      if (memeIdentifiant === undefined) {
        dictionnaire[partie].push(cloner(libelle));
      } else if (identiteDe(partie, memeIdentifiant) !== identite) {
        const memeIdentite = dictionnaire[partie].find((local) => identiteDe(partie, local) === identite);
        const identifiant = memeIdentite?.id ?? genererIdentifiant(partie);
        if (memeIdentite === undefined) {
          dictionnaire[partie].push({ ...cloner(libelle), id: identifiant });
        }
        renvois[partie].set(libelle.id, identifiant);
      }
    }
  }
  const structure: Listes = { ues: [], ecs: [], blocs: [], competences: [] };
  for (const partie of PARTIES) {
    structure[partie] = recu.structure[partie].map((element) => reecrireRenvois(partie, cloner(element), renvois));
  }
  return { dictionnaire, structure };
}

function lireTable(valeur: unknown): ObjetJson {
  return estObjet(valeur) ? { ...valeur } : {};
}

/**
 * Ajoute un référentiel reçu comme nouvelle version d'un diplôme du poste,
 * **sans l'activer** : ni le référentiel de travail, ni la version en
 * vigueur, ni les promotions ne changent. L'enseignant l'applique ensuite
 * lui-même aux promotions voulues.
 *
 * Le dictionnaire de libellés étant partagé, chaque libellé reçu est :
 * - réutilisé tel quel s'il existe déjà sous le même identifiant et la même identité ;
 * - rattaché à un libellé local de même identité s'il en existe un sous un autre identifiant ;
 * - ajouté sinon, sous un nouvel identifiant si le sien est déjà pris par autre chose.
 * Un libellé local n'est donc jamais modifié.
 *
 * @param donnees contenu de la clé `dnmade.data`, déjà analysé ; non modifié
 * @param genererIdentifiant rend un identifiant inédit pour la partie donnée
 * @returns les nouvelles données, ou `null` si elles n'ont pas la forme attendue
 */
export function integrerVersion(
  donnees: unknown,
  diplomeId: string,
  recu: ReferentielEchange,
  version: NouvelleVersion,
  genererIdentifiant: (partie: Partie) => string,
): ObjetJson | null {
  if (!estObjet(donnees)) {
    return null;
  }
  const dictionnaireLocal = lireListes(donnees.dico);
  if (dictionnaireLocal === null) {
    return null;
  }
  const { dictionnaire, structure } = integrerLibelles(dictionnaireLocal, recu, genererIdentifiant);
  const versions = lireTable(donnees.versions);
  const duDiplome: unknown = versions[diplomeId];
  const dejaPresentes: unknown[] = Array.isArray(duDiplome) ? duDiplome : [];
  versions[diplomeId] = [...dejaPresentes, { ...version, snap: structure }];
  return { ...donnees, dico: dictionnaire, versions };
}

/**
 * Indique si le poste n'a encore qu'un diplôme vide, jamais renseigné : celui
 * que l'application crée d'office à son premier lancement. Un tel diplôme
 * peut être remplacé par un diplôme reçu au lieu d'en ajouter un second.
 *
 * @param diplomesUtilises identifiants des diplômes auxquels une promotion est rattachée
 * @returns l'identifiant de ce diplôme, ou `null`
 */
export function trouverDiplomeVierge(donnees: unknown, diplomesUtilises: ReadonlySet<string>): string | null {
  if (!estObjet(donnees) || !Array.isArray(donnees.diplomes) || donnees.diplomes.length !== 1) {
    return null;
  }
  const diplome: unknown = donnees.diplomes[0];
  if (!estObjet(diplome) || typeof diplome.id !== "string" || diplomesUtilises.has(diplome.id)) {
    return null;
  }
  const referentiel = lireListes(estObjet(donnees.refs) ? donnees.refs[diplome.id] : null);
  const versions: unknown = estObjet(donnees.versions) ? donnees.versions[diplome.id] : undefined;
  const estVide =
    (referentiel === null || PARTIES.every((partie) => referentiel[partie].length === 0)) &&
    (!Array.isArray(versions) || versions.length === 0);
  return estVide ? diplome.id : null;
}

/**
 * Crée sur le poste le diplôme d'un référentiel reçu, avec ce référentiel
 * comme référentiel de travail et comme version en vigueur : contrairement à
 * `integrerVersion`, il n'y a rien d'existant à protéger, et le diplôme doit
 * être utilisable tout de suite.
 *
 * @param diplomeARemplacer identifiant d'un diplôme vierge à renseigner (voir
 *   `trouverDiplomeVierge`), ou `null` pour en ajouter un
 * @returns les nouvelles données, ou `null` si elles n'ont pas la forme attendue
 */
export function creerDiplome(
  donnees: unknown,
  recu: ReferentielEchange,
  version: NouvelleVersion,
  diplomeARemplacer: string | null,
  genererIdentifiant: (partie: Partie | "diplome") => string,
): ObjetJson | null {
  if (!estObjet(donnees)) {
    return null;
  }
  const dictionnaireLocal = lireListes(donnees.dico);
  if (dictionnaireLocal === null) {
    return null;
  }
  const { dictionnaire, structure } = integrerLibelles(dictionnaireLocal, recu, genererIdentifiant);
  const diplomeId = diplomeARemplacer ?? genererIdentifiant("diplome");
  const existants: unknown[] = Array.isArray(donnees.diplomes) ? donnees.diplomes : [];
  const diplomes =
    diplomeARemplacer === null
      ? [...existants, { id: diplomeId, nom: recu.diplome, mention: recu.mention }]
      : existants.map((diplome): unknown =>
          estObjet(diplome) && diplome.id === diplomeARemplacer
            ? { ...diplome, nom: recu.diplome, mention: recu.mention }
            : diplome,
        );
  // Les niveaux (Initié, Guidé…) sont communs à tout le poste : ils ne sont repris que s'il n'en a pas.
  const meta = estObjet(recu.contenuLisible) ? recu.contenuLisible.meta : null;
  const niveauxRecus: unknown = estObjet(meta) ? meta.niveaux : null;
  const sansNiveaux = !Array.isArray(donnees.niveaux) || donnees.niveaux.length === 0;
  return {
    ...donnees,
    dico: dictionnaire,
    diplomes,
    refs: { ...lireTable(donnees.refs), [diplomeId]: structure },
    versions: { ...lireTable(donnees.versions), [diplomeId]: [{ ...version, snap: cloner(structure) }] },
    valide: { ...lireTable(donnees.valide), [diplomeId]: version.id },
    ...(diplomeARemplacer === null ? {} : { activeDiplome: diplomeId }),
    ...(sansNiveaux && Array.isArray(niveauxRecus) ? { niveaux: cloner(niveauxRecus) } : {}),
  };
}

/** Ce qui distingue deux listes d'éléments, désignés par leur clé lisible (code ou nom). */
export interface Ecart {
  ajoutes: string[];
  retires: string[];
  modifies: string[];
}

export type Differences = Record<"blocs" | "ues" | "ecs" | "competences", Ecart>;

/** Champ qui désigne un élément dans le contenu lisible d'un référentiel. */
const CLES_LISIBLES: Record<keyof Differences, string> = { blocs: "num", ues: "nom", ecs: "nom", competences: "code" };

function indexer(contenu: unknown, partie: keyof Differences): Map<string, string> {
  const liste = estObjet(contenu) && Array.isArray(contenu[partie]) ? contenu[partie] : [];
  const index = new Map<string, string>();
  for (const element of liste) {
    if (estObjet(element)) {
      const cle = element[CLES_LISIBLES[partie]];
      index.set(typeof cle === "string" ? cle : ecrireJsonCanonique(cle), ecrireJsonCanonique(element));
    }
  }
  return index;
}

/**
 * Compare le contenu lisible de deux référentiels : ce que `recu` ajoute,
 * retire ou modifie par rapport à `local`.
 */
export function comparerContenus(local: unknown, recu: unknown): Differences {
  const differences = {} as Differences;
  for (const partie of ["blocs", "ues", "ecs", "competences"] as const) {
    const ici = indexer(retirerHorsContenu(local), partie);
    const fichier = indexer(retirerHorsContenu(recu), partie);
    differences[partie] = {
      ajoutes: [...fichier.keys()].filter((cle) => !ici.has(cle)),
      retires: [...ici.keys()].filter((cle) => !fichier.has(cle)),
      modifies: [...fichier.keys()].filter((cle) => ici.has(cle) && ici.get(cle) !== fichier.get(cle)),
    };
  }
  return differences;
}
