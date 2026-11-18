// SPDX-License-Identifier: CECILL-2.1
/**
 * Modèle des données de l'établissement (clé `dnmade.data`).
 *
 * Dictionnaire : les éléments eux-mêmes (nom, code, couleur, intitulé),
 * communs à tous les diplômes. Référentiel : pour chaque diplôme-mention, les
 * éléments retenus et leurs associations (semestres des UE ; UE, semestres,
 * ECTS et codes de chaque EC ; bloc et EC de chaque compétence). `ues`,
 * `ecs`, `blocs` et `competences` à la racine sont la vue fusionnée du
 * référentiel actif, reconstruite à chaque changement et jamais enregistrée.
 *
 * Les données viennent d'un JSON sans schéma écrit par l'interface
 * historique : les fonctions travaillent en place sur des objets ouverts et
 * gardent ses conventions (valeur absente lue comme texte vide, couleur par
 * défaut, semestres rangés de S1 à S6). Les identifiants neufs sont tirés
 * par `nouvelIdentifiant`, passé en paramètre.
 */
import { SEMESTRES, anneeDuSemestre, codesEc } from "./constituer";
import { codeDiplome, libelleDiplome } from "./diplomes";

export type Sorte = "ues" | "ecs" | "blocs" | "competences";
export type Element = Record<string, unknown>;
export type Referentiel = Record<Sorte, Element[]>;
/** Données de l'établissement, telles que l'interface les tient. */
export type Donnees = Record<string, unknown>;
/** Tire un identifiant neuf, préfixé (« u », « e », « b », « c », « d »…). */
export type NouvelIdentifiant = (prefixe: string) => string;

export const SORTES: readonly Sorte[] = ["ues", "ecs", "blocs", "competences"];
/** Champs portés par le dictionnaire, communs à tous les diplômes. */
export const CHAMPS_DICTIONNAIRE: Readonly<Record<Sorte, readonly string[]>> = {
  ues: ["nom", "code", "couleur"],
  ecs: ["nom", "couleur"],
  blocs: ["num", "nom"],
  competences: ["code", "libelle"],
};
/** Champs portés par le référentiel de chaque diplôme. */
export const CHAMPS_REFERENTIEL: Readonly<Record<Sorte, readonly string[]>> = {
  ues: ["sems"],
  ecs: ["ueId", "sems", "ects", "codes"],
  blocs: [],
  competences: ["bloc", "ecs"],
};
const COULEUR_PAR_DEFAUT = "#9aa2ae";

function rangSemestre(semestre: unknown): number {
  return SEMESTRES.indexOf(semestre as (typeof SEMESTRES)[number]);
}

function ranger(semestres: unknown[]): void {
  semestres.sort((a, b) => rangSemestre(a) - rangSemestre(b));
}

/** Comme `x==null?"":x`. */
function ouVide(valeur: unknown): unknown {
  return valeur ?? "";
}

/** Comme `String(x)` : un numéro absent devient « undefined », comme avant. */
function commeString(valeur: unknown): string {
   
  return String(valeur);
}

/** Comme `String(x==null?"":x)` ; les objets sont rendus par `String`, comme avant. */
function enTexte(valeur: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- même conversion que l'interface historique
  return String(valeur ?? "");
}

function estObjet(valeur: unknown): valeur is Element {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

/** Le tableau tel quel (le même objet, pour travailler en place), ou un tableau vide. */
function liste(valeur: unknown): Element[] {
  return Array.isArray(valeur) ? (valeur as Element[]) : [];
}

function objet(valeur: unknown): Element {
  return estObjet(valeur) ? valeur : {};
}

/** Copie d'une valeur d'association : tableaux et objets copiés d'un niveau, semestres des liens compris. */
export function copierValeur(valeur: unknown): unknown {
  if (Array.isArray(valeur)) {
    return valeur.map((element: unknown) => {
      if (element === null || typeof element !== "object") return element;
      const lien = element as Element;
      return Object.assign({}, lien, Array.isArray(lien.sems) ? { sems: (lien.sems as unknown[]).slice() } : {});
    });
  }
  return valeur !== null && typeof valeur === "object" ? Object.assign({}, valeur) : valeur;
}

export function referentielVide(): Referentiel {
  return { ues: [], ecs: [], blocs: [], competences: [] };
}

/** Référentiel d'un diplôme, créé vide s'il n'existe pas encore. */
export function referentielDe(donnees: Donnees, diplome: string): Referentiel {
  if (!donnees.refs) donnees.refs = {};
  const referentiels = donnees.refs as Record<string, Referentiel | undefined>;
  return referentiels[diplome] ?? (referentiels[diplome] = referentielVide());
}

function dictionnaire(donnees: Donnees): Referentiel {
  return donnees.dico as Referentiel;
}

/** Forme de comparaison d'un texte : minuscules, sans accents ni espaces autour. */
function normaliser(texte: unknown): string {
  return enTexte(texte)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Range des données à l'ancienne (éléments de tous les diplômes mêlés à la
 * racine, chacun marqué de son diplôme) en un dictionnaire commun et un
 * référentiel par diplôme. Deux éléments de même nom (et même code, ou même
 * UE pour un EC) deviennent une seule entrée du dictionnaire.
 */
export function classerDictionnaire(donnees: Donnees, nouvelIdentifiant: NouvelIdentifiant): void {
  const dico = referentielVide();
  const referentiels: Record<string, Referentiel> = {};
  const canon: Record<string, string> = {};
  const diplomes = liste(donnees.diplomes).map((diplome) => diplome.id);
  const actif = donnees.activeDiplome;
  for (const id of diplomes) referentiels[id as string] = referentielVide();
  const proprietaire = (element: Element): string => (diplomes.includes(element.diplomeId) ? element.diplomeId : actif) as string;
  const retenir = (sorte: Sorte, origine: Element, cle: string): string => {
    let entree = dico[sorte].find((candidate) => candidate._k === cle);
    if (entree === undefined) {
      entree = { id: origine.id || nouvelIdentifiant(sorte.charAt(0)), _k: cle };
      for (const champ of CHAMPS_DICTIONNAIRE[sorte]) entree[champ] = ouVide(origine[champ]);
      dico[sorte].push(entree);
    }
    if (origine.id) canon[`${sorte}:${enTexte(origine.id)}`] = entree.id as string;
    return entree.id as string;
  };
  const ues = liste(donnees.ues);
  const matieres = liste(donnees.matieres);
  const proprietaireUe = (id: unknown): string => {
    const ue = ues.find((candidate) => candidate.id === id);
    return ue ? proprietaire(ue) : (actif as string);
  };
  const matiere = (id: unknown): Element | null => matieres.find((candidate) => candidate.id === id) ?? null;
  const proprietaireMatiere = (id: unknown): string => {
    const trouvee = matiere(id);
    return trouvee ? proprietaireUe(trouvee.ueId) : (actif as string);
  };
  const ref = (diplome: string): Referentiel => referentiels[diplome] as Referentiel;
  for (const ue of ues) {
    ref(proprietaire(ue)).ues.push({
      id: retenir("ues", ue, `${normaliser(ue.nom)}|${normaliser(ue.code)}`),
      sems: Array.isArray(ue.sems) ? (ue.sems as unknown[]).slice() : SEMESTRES.slice(),
    });
  }
  const semestresAnciens: Record<string, unknown[]> = {};
  for (const ec of liste(donnees.ecs)) {
    const laMatiere = ec.matiereId ? (matiere(ec.matiereId) ?? {}) : {};
    const ueSource = ec.matiereId ? laMatiere.ueId : ec.ueId;
    const nom = enTexte(ec.nom || "").trim() || laMatiere.nom || enTexte(ec.code || "").trim();
    const origine: Element = { nom, couleur: ec.couleur || laMatiere.couleur || COULEUR_PAR_DEFAUT, id: ec.id };
    const diplome = ec.matiereId ? proprietaireMatiere(ec.matiereId) : proprietaireUe(ueSource);
    const id = retenir("ecs", origine, `${normaliser(nom)}|${normaliser(ueSource || "")}`);
    semestresAnciens[enTexte(ec.id)] = liste(ec.sems).slice();
    const referentiel = ref(diplome);
    let entree = referentiel.ecs.find((candidate) => candidate.id === id);
    if (entree === undefined) {
      entree = { id, ueId: canon[`ues:${enTexte(ueSource || "")}`] || "", sems: [], ects: ec.ects || "", codes: {} };
      referentiel.ecs.push(entree);
    }
    if (!entree.ueId) entree.ueId = canon[`ues:${enTexte(ueSource || "")}`] || "";
    if (!entree.ects) entree.ects = ec.ects || "";
    const semestres = entree.sems as unknown[];
    const codes = entree.codes as Record<string, unknown>;
    for (const semestre of liste(ec.sems) as unknown[]) {
      if (!semestres.includes(semestre)) semestres.push(semestre);
      const annee = anneeDuSemestre(semestre as string);
      const code: unknown = ec.code || (objet(ec.codes)[annee] || "");
      if (!codes[annee] && code) codes[annee] = code;
    }
    ranger(semestres);
  }
  for (const bloc of liste(donnees.blocs)) {
    ref(proprietaire(bloc)).blocs.push({ id: retenir("blocs", bloc, `${normaliser(bloc.num)}|${normaliser(bloc.nom)}`) });
  }
  for (const competence of liste(donnees.competences)) {
    const liens = new Map<string, { id: string; sems: unknown[] }>();
    const sources: Element[] = Array.isArray(competence.ecs)
      ? (competence.ecs as Element[])
      : (liste(competence.ecIds) as unknown[]).map((id) => ({ id, sems: null }));
    for (const lien of sources) {
      const nouveau = canon[`ecs:${enTexte(lien.id)}`];
      if (!nouveau) continue;
      const semestres = Array.isArray(lien.sems) && lien.sems.length > 0 ? (lien.sems as unknown[]) : (semestresAnciens[enTexte(lien.id)] ?? []);
      const entree = liens.get(nouveau) ?? { id: nouveau, sems: [] };
      for (const semestre of semestres) if (!entree.sems.includes(semestre)) entree.sems.push(semestre);
      liens.set(nouveau, entree);
    }
    for (const lien of liens.values()) ranger(lien.sems);
    ref(proprietaire(competence)).competences.push({
      id: retenir("competences", competence, `${normaliser(competence.code)}|${normaliser(competence.libelle)}`),
      bloc: enTexte(competence.bloc || ""),
      ecs: [...liens.values()],
    });
  }
  for (const referentiel of Object.values(referentiels)) {
    for (const sorte of SORTES) {
      const vus = new Set<unknown>();
      referentiel[sorte] = referentiel[sorte].filter((entree) => {
        if (vus.has(entree.id)) return false;
        vus.add(entree.id);
        return true;
      });
    }
  }
  for (const sorte of SORTES) for (const entree of dico[sorte]) Reflect.deleteProperty(entree, "_k");
  donnees.dico = dico;
  donnees.refs = referentiels;
}

/** Reconstruit la vue fusionnée (`ues`, `ecs`, `blocs`, `competences`) du référentiel actif. */
export function materialiser(donnees: Donnees): void {
  const actif = donnees.activeDiplome;
  const referentiel = referentielDe(donnees, actif as string);
  const dico = dictionnaire(donnees);
  for (const sorte of SORTES) {
    donnees[sorte] = referentiel[sorte]
      .map((entree) => {
        const element = dico[sorte].find((candidate) => candidate.id === entree.id);
        if (!element) return null;
        const vue: Element = { id: element.id };
        for (const champ of CHAMPS_DICTIONNAIRE[sorte]) vue[champ] = ouVide(element[champ]);
        for (const champ of CHAMPS_REFERENTIEL[sorte]) vue[champ] = copierValeur(entree[champ]);
        if (sorte === "ues" || sorte === "blocs" || sorte === "competences") vue.diplomeId = actif;
        return vue;
      })
      .filter((vue): vue is Element => vue !== null);
  }
  for (const ue of donnees.ues as Element[]) {
    if (!Array.isArray(ue.sems)) ue.sems = SEMESTRES.slice();
    Reflect.deleteProperty(ue, "ects");
  }
  for (const ec of donnees.ecs as Element[]) {
    if (!Array.isArray(ec.sems)) ec.sems = [];
    if (ec.ects == null) ec.ects = "";
    if (ec.ueId == null) ec.ueId = "";
    if (!enTexte(ec.couleur || "").trim()) ec.couleur = COULEUR_PAR_DEFAUT;
    if (!ec.codes || typeof ec.codes !== "object") ec.codes = {};
  }
  for (const competence of donnees.competences as Element[]) {
    if (!Array.isArray(competence.ecs)) competence.ecs = [];
    competence.ecs = (competence.ecs as unknown[])
      .filter((lien): lien is Element => Boolean(lien) && Boolean((lien as Element).id))
      .map((lien) => ({ id: lien.id, sems: Array.isArray(lien.sems) ? (lien.sems as unknown[]).slice() : [] }));
    competence.ecIds = (competence.ecs as Element[]).map((lien) => lien.id);
    if (competence.bloc == null) competence.bloc = "";
  }
  donnees._viewOf = actif;
}

/**
 * Reporte la vue fusionnée dans le dictionnaire et le référentiel du diplôme
 * qu'elle montre. Sans effet si ce diplôme n'existe plus.
 */
export function absorber(donnees: Donnees, nouvelIdentifiant: NouvelIdentifiant): void {
  const vue = donnees._viewOf;
  if (!vue || !liste(donnees.diplomes).some((diplome) => diplome.id === vue)) return;
  const referentiel = referentielDe(donnees, vue as string);
  const dico = dictionnaire(donnees);
  for (const sorte of SORTES) {
    referentiel[sorte] = liste(donnees[sorte]).map((element) => {
      if (!element.id) element.id = nouvelIdentifiant(sorte.charAt(0));
      let entree = dico[sorte].find((candidate) => candidate.id === element.id);
      if (!entree) {
        entree = { id: element.id };
        dico[sorte].push(entree);
      }
      for (const champ of CHAMPS_DICTIONNAIRE[sorte]) entree[champ] = ouVide(element[champ]);
      const association: Element = { id: element.id };
      for (const champ of CHAMPS_REFERENTIEL[sorte]) association[champ] = copierValeur(element[champ]);
      if (sorte === "competences" && !Array.isArray(association.ecs)) {
        association.ecs = (liste(element.ecIds) as unknown[]).map((id) => ({ id, sems: [] }));
      }
      return association;
    });
  }
}

/** Ce qui s'enregistre : tout, sauf la vue fusionnée et la marque du diplôme qu'elle montre. */
export function donneesAEnregistrer(donnees: Donnees): Donnees {
  const copie: Donnees = Object.assign({}, donnees);
  for (const sorte of SORTES) Reflect.deleteProperty(copie, sorte);
  Reflect.deleteProperty(copie, "_viewOf");
  return copie;
}

/**
 * Associations proposées quand un élément du dictionnaire entre dans le
 * référentiel d'un diplôme : celles qu'il a déjà dans un autre diplôme,
 * ajustées à ce que contient le référentiel cible.
 */
export function associationsProposees(donnees: Donnees, diplome: string, sorte: Sorte, id: unknown): Element {
  const cible = referentielDe(donnees, diplome);
  let source: Element | undefined;
  Object.entries(donnees.refs as Record<string, Referentiel>).some(([autre, referentiel]) => autre !== diplome && (source = referentiel[sorte].find((entree) => entree.id === id)));
  const association: Element = Object.assign({ id }, source ? (JSON.parse(JSON.stringify(source)) as Element) : {});
  const contient = (autreSorte: Sorte, autreId: unknown): boolean => cible[autreSorte].some((entree) => entree.id === autreId);
  if (sorte === "ues") {
    if (!Array.isArray(association.sems)) association.sems = SEMESTRES.slice();
    Reflect.deleteProperty(association, "ects");
  }
  if (sorte === "ecs") {
    if (!contient("ues", association.ueId)) association.ueId = cible.ues[0]?.id || "";
    if (!Array.isArray(association.sems)) association.sems = [];
    if (association.ects == null) association.ects = "";
    if (!association.codes || typeof association.codes !== "object") association.codes = {};
  }
  if (sorte === "competences") {
    association.ecs = liste(association.ecs).filter((lien) => Boolean(lien) && contient("ecs", lien.id));
    if (association.bloc == null) association.bloc = "";
  }
  return association;
}

/**
 * Ajoute une mention qui reprend le référentiel d'un diplôme existant ; la
 * vue en cours est d'abord reportée. Rend le nouveau diplôme.
 */
export function ajouterMention(donnees: Donnees, source: string, nom: string, nouvelIdentifiant: NouvelIdentifiant): Element {
  const diplome: Element = { id: nouvelIdentifiant("d"), nom: nom || "", mention: "", code: "" };
  absorber(donnees, nouvelIdentifiant);
  (donnees.diplomes as Element[]).push(diplome);
  (donnees.refs as Record<string, Referentiel>)[diplome.id as string] = JSON.parse(JSON.stringify(referentielDe(donnees, source))) as Referentiel;
  return diplome;
}

/** Référentiel source (paquet ou référentiel livré) avant classement. */
export interface ReferentielSource {
  readonly meta?: { diplome?: unknown; blocTint?: unknown; niveaux?: unknown };
  readonly ues?: readonly Element[];
  readonly familles?: readonly Element[];
  readonly blocs?: readonly Element[];
  readonly competences?: readonly Element[];
}

/**
 * Données à l'ancienne à partir d'un référentiel source : UE, EC (une
 * famille d'EC par nom), blocs et compétences, avec leurs semestres et les
 * codes d'EC de chaque année.
 */
export function donneesDuReferentiel(source: ReferentielSource, livrables: readonly unknown[] | undefined): Donnees {
  // « UE-ATELIER » et « UE ATELIER » désignent la même UE : le trait d'union entre capitales tombe.
  const nettoyer = (valeur: unknown): string => enTexte(valeur).replace(/([A-ZÀ-Ý])-([A-ZÀ-Ý])/g, "$1$2").trim();
  const ues: Element[] = [];
  const ecs: Element[] = [];
  const competences: Element[] = [];
  (source.ues ?? []).forEach((ue, rang) => ues.push({ id: `u${String(rang)}`, nom: nettoyer(ue.nom), couleur: ue.couleur || COULEUR_PAR_DEFAUT }));
  const nomFamille = (famille: unknown): string =>
    enTexte(famille || "")
      .replace(/^EC /, "")
      .trim();
  const familles = new Map<string, Element>();
  for (const famille of source.familles ?? []) {
    let ue = ues.find((candidate) => candidate.nom === nettoyer(famille.ue));
    if (!ue) {
      ue = { id: `u${String(ues.length)}`, nom: nettoyer(famille.ue) || "UE", couleur: COULEUR_PAR_DEFAUT };
      ues.push(ue);
    }
    const nom = nomFamille(famille.nom);
    if (familles.has(nom)) continue;
    const ec: Element = { id: `e${String(familles.size)}`, nom, couleur: famille.couleur || COULEUR_PAR_DEFAUT, ueId: ue.id, sems: [], ects: "", codes: {} };
    familles.set(nom, ec);
    ecs.push(ec);
  }
  for (const competence of source.competences ?? []) {
    for (const lien of liste(competence.ecs)) {
      const nom = nomFamille(lien.famille);
      let ec = familles.get(nom);
      if (!ec) {
        ec = { id: `e${String(familles.size)}`, nom, couleur: COULEUR_PAR_DEFAUT, ueId: ues[0]?.id || "", sems: [], ects: "", codes: {} };
        familles.set(nom, ec);
        ecs.push(ec);
      }
      const semestres = ec.sems as unknown[];
      if (!semestres.includes(lien.sem)) semestres.push(lien.sem);
      const annee = anneeDuSemestre(lien.sem as string);
      const codes = ec.codes as Record<string, unknown>;
      if (!codes[annee]) codes[annee] = lien.ec;
    }
  }
  for (const ec of ecs) ranger(ec.sems as unknown[]);
  (source.competences ?? []).forEach((competence, rang) => {
    const liens = new Map<unknown, { id: unknown; sems: unknown[] }>();
    for (const lien of liste(competence.ecs)) {
      const ec = familles.get(nomFamille(lien.famille));
      if (!ec) continue;
      const entree = liens.get(ec.id) ?? { id: ec.id, sems: [] };
      if (!entree.sems.includes(lien.sem)) entree.sems.push(lien.sem);
      liens.set(ec.id, entree);
    }
    for (const lien of liens.values()) ranger(lien.sems);
    competences.push({ id: `c${String(rang)}`, code: competence.code, bloc: enTexte(competence.bloc || ""), libelle: competence.libelle || "", ecs: [...liens.values()] });
  });
  const meta = source.meta ?? {};
  return {
    diplome: meta.diplome || "",
    blocTint: meta.blocTint || "#D1F1DA",
    niveaux: meta.niveaux || [],
    blocs: (source.blocs ?? []).map((bloc) => ({ num: commeString(bloc.num), nom: bloc.nom || "" })),
    ues,
    ecs,
    competences,
    livrables: (livrables ?? []).slice(),
  };
}

/**
 * Données complètes (installation neuve, exemple) à partir de
 * `donneesDuReferentiel` : un diplôme, le dictionnaire et son référentiel,
 * puis la vue fusionnée. Sans référentiel, un diplôme-cadre caché tient lieu
 * de diplôme actif. Travaille en place et rend les mêmes données.
 */
export function construireDonnees(donnees: Donnees, nouvelIdentifiant: NouvelIdentifiant): Donnees {
  const complet = enTexte(donnees.diplome || "");
  const mention = (/mention\s+(.+)$/i.exec(complet) ?? [])[1] ?? "";
  const nom = complet.replace(/\s*mention\s+.+$/i, "").trim();
  donnees.diplomes = [nom ? { id: "d0", nom, mention: mention.trim() } : { id: "d0", nom: "", mention: "", cadre: true }];
  donnees.activeDiplome = "d0";
  for (const ue of donnees.ues as Element[]) {
    ue.diplomeId = "d0";
    if (!Array.isArray(ue.sems)) ue.sems = SEMESTRES.slice();
    if (ue.code === undefined) ue.code = "";
    if (ue.ects === undefined) ue.ects = "";
  }
  for (const bloc of donnees.blocs as Element[]) bloc.diplomeId = "d0";
  for (const competence of donnees.competences as Element[]) competence.diplomeId = "d0";
  classerDictionnaire(donnees, nouvelIdentifiant);
  // L'identifiant d'année se déduit du code du diplôme : le référentiel source porte « DN1 », « DN2 »…
  for (const niveau of liste(donnees.niveaux)) if (/^DN\s*\d$/i.test(enTexte(niveau.code || "").trim())) niveau.code = "";
  const dico = dictionnaire(donnees);
  for (const sorte of SORTES) if (!Array.isArray(dico[sorte])) dico[sorte] = [];
  donnees.livrables = (Array.isArray(donnees.livrables) ? (donnees.livrables as unknown[]) : []).map((livrable) => (typeof livrable === "string" ? { nom: livrable, type: "" } : livrable));
  donnees.enseignants = [];
  Reflect.deleteProperty(donnees, "diplome");
  materialiser(donnees);
  return donnees;
}

/** Code d'une année : celui que le référentiel donne au niveau, sinon le code du diplôme suivi du numéro d'année. */
export function codeAnnee(annee: number | string, donnees: Donnees, diplome?: Element): string {
  const niveau = liste(donnees.niveaux).find((candidat) => Number(candidat.annee) === Number(annee));
  const code = enTexte(objet(niveau).code || "").trim();
  if (code) return code;
  const leDiplome = diplome ?? liste(donnees.diplomes).find((candidat) => candidat.id === donnees.activeDiplome) ?? {};
  return codeDiplome(leDiplome) + String(annee);
}

/** Codes d'un EC, un par année ; « — » s'il n'en a aucun. */
function libelleCodes(ec: Element): string {
  const codes = codesEc(ec);
  return codes.length > 0 ? codes.join(" · ") : "—";
}

/**
 * Référentiel actif tel que l'interface le lit : diplôme, blocs, UE, EC
 * (nom, couleur, codes, UE, semestres) et compétences, chaque compétence
 * portant une entrée par EC et par semestre où elle est enseignée, avec le
 * code de l'EC et celui de l'année. Les EC rattachés à une UE d'un autre
 * diplôme, et les semestres où l'EC ou son UE n'ont pas cours, sont laissés de côté.
 */
export function projeterReferentiel(donnees: Donnees): Element {
  const actif = donnees.activeDiplome;
  const duDiplome = (element: Element): boolean => !element.diplomeId || element.diplomeId === actif;
  const ues = liste(donnees.ues).filter(duDiplome);
  const idsUes = ues.map((ue) => ue.id);
  const tousLesEcs = liste(donnees.ecs);
  const ecsDuReferentiel = tousLesEcs.filter((ec) => idsUes.includes(ec.ueId));
  const ueDe = (id: unknown): Element | undefined => ues.find((ue) => ue.id === id);
  const nomEc = (ec: Element): string => enTexte(ec.nom || "").trim() || libelleCodes(ec);
  const diplome = liste(donnees.diplomes).find((candidat) => candidat.id === actif) ?? {};
  return {
    meta: { diplome: libelleDiplome(diplome), diplomeNom: diplome.nom || "", mention: diplome.mention || "", blocTint: donnees.blocTint, niveaux: donnees.niveaux },
    blocs: liste(donnees.blocs)
      .filter(duDiplome)
      .map((bloc) => ({ num: bloc.num, nom: bloc.nom })),
    ues: ues.map((ue) => ({ nom: ue.nom, couleur: ue.couleur, code: ue.code, sems: ue.sems })),
    ecs: ecsDuReferentiel.map((ec) => ({
      id: ec.id,
      nom: nomEc(ec),
      couleur: ec.couleur || COULEUR_PAR_DEFAUT,
      codes: Object.assign({}, ec.codes || {}),
      ue: ueDe(ec.ueId)?.nom || "UE non précisée",
      sems: (liste(ec.sems) as unknown[]).slice(),
    })),
    competences: liste(donnees.competences)
      .filter(duDiplome)
      .map((competence) => {
        const ecs: Element[] = [];
        for (const lien of liste(competence.ecs)) {
          const ec = tousLesEcs.find((candidat) => candidat.id === lien.id);
          if (!ec || !idsUes.includes(ec.ueId)) continue;
          const ue: Element = ueDe(ec.ueId) ?? { sems: SEMESTRES };
          const semestresEc = liste(ec.sems) as unknown[];
          const semestresUe = Array.isArray(ue.sems) ? (ue.sems as unknown[]) : (SEMESTRES as readonly unknown[]);
          const semestres = (Array.isArray(lien.sems) && lien.sems.length > 0 ? (lien.sems as unknown[]) : semestresEc).filter(
            (semestre) => semestresEc.includes(semestre) && semestresUe.includes(semestre),
          );
          for (const semestre of semestres) {
            const annee = anneeDuSemestre(semestre as string);
            const code = enTexte(objet(ec.codes)[annee] || "") || codesEc(ec)[0] || nomEc(ec);
            ecs.push({ ec: code, id: ec.id, nom: nomEc(ec), couleur: ec.couleur || COULEUR_PAR_DEFAUT, ue: ue.nom || "UE non précisée", sem: semestre, dn: codeAnnee(annee, donnees, diplome) });
          }
        }
        return { code: competence.code, libelle: competence.libelle, bloc: competence.bloc, ecs };
      }),
  };
}

/** Projection d'une version validée du référentiel d'un diplôme, sans toucher aux données tenues. */
export function projeterVersion(donnees: Donnees, diplome: string, version: Referentiel): Element {
  const copie: Donnees = Object.assign({}, donnees, { refs: Object.assign({}, donnees.refs, { [diplome]: version }), activeDiplome: diplome });
  materialiser(copie);
  return projeterReferentiel(copie);
}
