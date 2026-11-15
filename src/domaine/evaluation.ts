// SPDX-License-Identifier: CECILL-2.1
import { estObjet, type ObjetJson } from "./echange/modele";

/**
 * Règles de la composition d'une évaluation : sa forme, ses lignes (une
 * compétence seule, ou plusieurs réunies en compétence opérationnelle), les
 * livrables de chaque ligne, le semestre suggéré par la date et ce qu'il faut
 * pour l'enregistrer.
 *
 * L'évaluation est celle que l'interface historique range dans `dnmade.fiches` :
 * `items` (compétences retenues), `ops` (regroupements), `livrables`,
 * `classes`, `semestre`, `res` (résultats des étudiants)… Ces fonctions ne
 * modifient jamais ce qu'on leur passe ; les champs qu'elles ne connaissent
 * pas sont transportés tels quels.
 */

/** Une compétence retenue dans l'évaluation. `op` : regroupement auquel elle appartient, ou `""`. */
export interface CompetenceRetenue extends ObjetJson {
  code: string;
  op: string;
  libelle: string;
  livrables: string[];
}

/** Plusieurs compétences réunies en une compétence opérationnelle, formulée une fois. */
export interface Regroupement extends ObjetJson {
  id: string;
  libelle: string;
  livrables: string[];
}

/** Une ligne de la grille : un regroupement et ses compétences, ou une compétence seule. */
export type Ligne =
  | { regroupement: Regroupement; competences: CompetenceRetenue[] }
  | { regroupement: null; competence: CompetenceRetenue };

const MOIS_RENTREE = 9;
const SEMESTRES = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

function textes(valeur: unknown): string[] {
  return Array.isArray(valeur) ? valeur.filter((element): element is string => typeof element === "string") : [];
}

function sansDoublon<T>(valeurs: Iterable<T>): T[] {
  return [...new Set(valeurs)];
}

function competencesDe(evaluation: ObjetJson): CompetenceRetenue[] {
  return (Array.isArray(evaluation.items) ? evaluation.items : []).filter(estObjet).map((item) => ({
    ...item,
    code: texte(item.code),
    op: texte(item.op),
    libelle: texte(item.libelle),
    livrables: textes(item.livrables),
  }));
}

function regroupementsDe(evaluation: ObjetJson): Regroupement[] {
  return (Array.isArray(evaluation.ops) ? evaluation.ops : []).filter(estObjet).map((op) => ({
    ...op,
    id: texte(op.id),
    libelle: texte(op.libelle),
    livrables: textes(op.livrables),
  }));
}

/** Classes nettoyées (espaces, vides, doublons) et leur intitulé commun, « DN2-A, DN2-B ». */
export function classesNettoyees(classes: readonly unknown[]): { classes: string[]; classe: string } {
  const propres = sansDoublon(classes.map((classe) => texte(classe).trim()).filter((classe) => classe !== ""));
  return { classes: propres, classe: propres.join(", ") };
}

/**
 * Évaluation prête à être affichée : listes présentes, intitulé des classes
 * recalculé, résultats sous forme d'objet. Rien n'est retiré.
 */
export function normaliserEvaluation(brut: unknown): ObjetJson {
  const evaluation = estObjet(brut) ? brut : {};
  const { classes, classe } = classesNettoyees(Array.isArray(evaluation.classes) ? evaluation.classes : []);
  return {
    ...evaluation,
    ues: Array.isArray(evaluation.ues) ? evaluation.ues : [],
    classes,
    classe,
    res: estObjet(evaluation.res) ? evaluation.res : {},
  };
}

/**
 * Lignes de la grille, dans l'ordre : les regroupements (dans leur ordre de
 * création) qui comptent encore au moins une compétence, puis les compétences seules.
 */
export function lignesDe(brut: unknown): Ligne[] {
  const evaluation = estObjet(brut) ? brut : {};
  const competences = competencesDe(evaluation);
  const lignes: Ligne[] = [];
  for (const regroupement of regroupementsDe(evaluation)) {
    const membres = competences.filter((competence) => competence.op === regroupement.id);
    if (membres.length > 0) {
      lignes.push({ regroupement, competences: membres });
    }
  }
  for (const competence of competences.filter((candidate) => candidate.op === "")) {
    lignes.push({ regroupement: null, competence });
  }
  return lignes;
}

/** Clé d'une ligne, sous laquelle ses résultats sont rangés : `op:<id>` ou `one:<code>`. */
export function cleLigne(ligne: Ligne): string {
  return ligne.regroupement === null ? `one:${ligne.competence.code}` : `op:${ligne.regroupement.id}`;
}

/**
 * EC rattachés à une compétence dans l'évaluation : ceux que l'évaluation a
 * retenus parmi les EC de la compétence au semestre, ou tous s'il n'en retient aucun.
 */
export function ecsRetenus(ecsDeLaCompetence: readonly string[], ecsDeLEvaluation: readonly string[]): string[] {
  const retenus = ecsDeLaCompetence.filter((ec) => ecsDeLEvaluation.includes(ec));
  return retenus.length > 0 ? retenus : [...ecsDeLaCompetence];
}

/** Année scolaire d'une date, « 2026-2027 » : elle commence au mois de la rentrée (septembre). */
export function anneeScolaire(date: Date): string {
  const annee = date.getMonth() + 1 >= MOIS_RENTREE ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(annee)}-${String(annee + 1)}`;
}

/** Premier ou second semestre de l'année scolaire : le premier va de septembre à janvier. */
export function rangSemestre(date: Date): 1 | 2 {
  const mois = date.getMonth() + 1;
  return mois >= MOIS_RENTREE || mois <= 1 ? 1 : 2;
}

/** Semestres d'une année du diplôme : S1 et S2 en année 1, S3 et S4 en année 2… */
export function semestresDeLAnnee(annee: number): string[] {
  return SEMESTRES.slice((annee - 1) * 2, annee * 2);
}

/** Semestre que la date suggère pour une année du diplôme, ou `""` si l'année est inconnue (0). */
export function semestreSuggere(annee: number, date: Date): string {
  if (annee <= 0) {
    return "";
  }
  const semestres = semestresDeLAnnee(annee);
  return semestres[rangSemestre(date) - 1] ?? semestres[0] ?? "";
}

/**
 * Année du diplôme lue dans un nom de classe : le chiffre final après un
 * tiret (« DNO-2026-2 »), sinon un chiffre de 1 à 3 isolé (« DN MADE 2 »), sinon 0.
 */
export function anneeDeClasse(nom: unknown): number {
  const libelle = texte(nom);
  const finale = /-\s*([1-3])\s*$/.exec(libelle);
  if (finale?.[1] !== undefined) {
    return Number(finale[1]);
  }
  const isole = /(?:^|[^\d])([1-3])(?:[^\d]|$)/.exec(libelle);
  return isole?.[1] !== undefined ? Number(isole[1]) : 0;
}

/**
 * Défait les regroupements qui ne réunissent plus au moins deux compétences.
 * La compétence qui reste seule reprend les livrables du regroupement, et
 * sa formulation si elle n'en avait pas.
 */
export function nettoyerRegroupements(brut: unknown): { items: CompetenceRetenue[]; ops: Regroupement[] } {
  const evaluation = estObjet(brut) ? brut : {};
  let items = competencesDe(evaluation);
  const ops = regroupementsDe(evaluation).filter((regroupement) => {
    const membres = items.filter((competence) => competence.op === regroupement.id);
    if (membres.length >= 2) {
      return true;
    }
    const seule = membres[0];
    if (seule !== undefined) {
      items = items.map((competence) =>
        competence === seule
          ? {
              ...competence,
              op: "",
              livrables: sansDoublon([...competence.livrables, ...regroupement.livrables]),
              libelle: competence.libelle.trim() === "" && regroupement.libelle.trim() !== "" ? regroupement.libelle : competence.libelle,
            }
          : competence,
      );
    }
    return false;
  });
  return { items, ops };
}

/**
 * Dépose la compétence `code` sur la ligne `cle`. Sur un regroupement, elle
 * le rejoint et lui apporte ses livrables. Sur une compétence seule, les deux
 * forment un nouveau regroupement (identifiant `nouvelId`), qui prend la
 * formulation de la ligne d'arrivée et les livrables des deux. Sans effet si
 * la compétence ou la ligne n'existe pas, ou si elle est déposée sur elle-même.
 */
export function rattacher(
  brut: unknown,
  cle: string,
  code: string,
  nouvelId: () => string,
): { items: CompetenceRetenue[]; ops: Regroupement[] } {
  const evaluation = estObjet(brut) ? brut : {};
  let items = competencesDe(evaluation);
  let ops = regroupementsDe(evaluation);
  const deposee = items.find((competence) => competence.code === code);
  if (deposee === undefined) {
    return { items, ops };
  }
  if (cle.startsWith("op:")) {
    const id = cle.slice(3);
    if (deposee.op === id) {
      return { items, ops };
    }
    items = items.map((competence) => (competence === deposee ? { ...competence, op: id } : competence));
    ops = ops.map((regroupement) =>
      regroupement.id === id ? { ...regroupement, livrables: sansDoublon([...regroupement.livrables, ...deposee.livrables]) } : regroupement,
    );
  } else {
    const codeCible = cle.slice(4);
    const cible = items.find((competence) => competence.code === codeCible);
    if (codeCible === code || cible === undefined) {
      return { items, ops };
    }
    const regroupement: Regroupement = {
      id: nouvelId(),
      libelle: cible.libelle,
      livrables: sansDoublon([...cible.livrables, ...deposee.livrables]),
    };
    ops = [...ops, regroupement];
    items = items.map((competence) =>
      competence === cible || competence === deposee ? { ...competence, op: regroupement.id } : competence,
    );
  }
  return nettoyerRegroupements({ ...evaluation, items, ops });
}

/** Sort la compétence `code` de son regroupement ; elle emporte les livrables du regroupement. */
export function detacher(brut: unknown, code: string): { items: CompetenceRetenue[]; ops: Regroupement[] } {
  const evaluation = estObjet(brut) ? brut : {};
  const items = competencesDe(evaluation);
  const ops = regroupementsDe(evaluation);
  const sortante = items.find((competence) => competence.code === code);
  if (sortante === undefined || sortante.op === "") {
    return { items, ops };
  }
  const regroupement = ops.find((candidat) => candidat.id === sortante.op);
  const livrables = regroupement === undefined ? sortante.livrables : sansDoublon([...sortante.livrables, ...regroupement.livrables]);
  return nettoyerRegroupements({
    ...evaluation,
    items: items.map((competence) => (competence === sortante ? { ...competence, op: "", livrables } : competence)),
    ops,
  });
}

/**
 * Ajoute (ou retire) un livrable à la ligne `cle`. Seul un livrable attendu
 * dans l'évaluation peut être ajouté. Sans effet sur une ligne inconnue.
 */
export function changerLivrableDeLigne(
  brut: unknown,
  cle: string,
  livrable: string,
  present: boolean,
): { items: CompetenceRetenue[]; ops: Regroupement[] } {
  const evaluation = estObjet(brut) ? brut : {};
  const items = competencesDe(evaluation);
  const ops = regroupementsDe(evaluation);
  if (present && !textes(evaluation.livrables).includes(livrable)) {
    return { items, ops };
  }
  const changer = <T extends { livrables: string[] }>(ligne: T): T => ({
    ...ligne,
    livrables: present ? sansDoublon([...ligne.livrables, livrable]) : ligne.livrables.filter((element) => element !== livrable),
  });
  if (cle.startsWith("op:")) {
    const id = cle.slice(3);
    return { items, ops: ops.map((regroupement) => (regroupement.id === id ? changer(regroupement) : regroupement)) };
  }
  const code = cle.slice(4);
  return { items: items.map((competence) => (competence.code === code ? changer(competence) : competence)), ops };
}

/**
 * Réunit les lignes sélectionnées (au moins deux) en une compétence
 * opérationnelle. S'il y a parmi elles des regroupements, le premier accueille
 * les compétences des autres, qui disparaissent ; sinon un regroupement est
 * créé (identifiant `nouvelId`). Chaque compétence seule le rejoint avec ses
 * livrables, et sa formulation sert au regroupement qui n'en a pas encore.
 *
 * @returns aussi l'identifiant du regroupement obtenu, `""` si rien n'a été réuni
 */
export function reunir(
  brut: unknown,
  cles: readonly string[],
  nouvelId: () => string,
): { items: CompetenceRetenue[]; ops: Regroupement[]; regroupement: string } {
  const evaluation = estObjet(brut) ? brut : {};
  let items = competencesDe(evaluation);
  let ops = regroupementsDe(evaluation);
  if (cles.length < 2) {
    return { items, ops, regroupement: "" };
  }
  const idsRegroupements = cles.filter((cle) => cle.startsWith("op:")).map((cle) => cle.slice(3));
  const codes = cles.filter((cle) => cle.startsWith("one:")).map((cle) => cle.slice(4));
  const accueil = ops.find((regroupement) => regroupement.id === idsRegroupements[0]);
  let regroupement: Regroupement;
  if (accueil !== undefined) {
    const absorbes = new Set(idsRegroupements.slice(1));
    items = items.map((competence) => (absorbes.has(competence.op) ? { ...competence, op: accueil.id } : competence));
    ops = ops.filter((candidat) => !absorbes.has(candidat.id));
    regroupement = accueil;
  } else {
    regroupement = { id: nouvelId(), libelle: "", livrables: [] };
    ops = [...ops, regroupement];
  }
  let { libelle, livrables } = regroupement;
  items = items.map((competence) => {
    if (!codes.includes(competence.code)) {
      return competence;
    }
    livrables = sansDoublon([...livrables, ...competence.livrables]);
    if (libelle === "" && competence.libelle !== "") {
      libelle = competence.libelle;
    }
    return { ...competence, op: regroupement.id };
  });
  const id = regroupement.id;
  ops = ops.map((candidat) => (candidat.id === id ? { ...candidat, libelle, livrables } : candidat));
  return { items, ops, regroupement: id };
}

/** Ce qui manque pour enregistrer l'évaluation, à citer à l'enseignant ; vide si rien ne manque. */
export function manquesPourEnregistrer(brut: unknown): string[] {
  const evaluation = estObjet(brut) ? brut : {};
  const manques: string[] = [];
  if (texte(evaluation.titre).trim() === "") {
    manques.push("un intitulé");
  }
  if (competencesDe(evaluation).length === 0) {
    manques.push("au moins une compétence");
  }
  return manques;
}

/**
 * Où en est l'évaluation en cours : `liste` si elle est dans « Mes
 * évaluations », `bloquee` si un référentiel non validé l'en empêche, `vide`
 * si elle n'est pas encore commencée (elle n'y entre qu'une fois commencée).
 */
export function etatEnregistrement(situation: {
  dansLaListe: boolean;
  commencee: boolean;
  referentielBloquant: boolean;
}): "liste" | "bloquee" | "vide" {
  if (situation.dansLaListe) {
    return situation.referentielBloquant ? "bloquee" : "liste";
  }
  return situation.commencee && situation.referentielBloquant ? "bloquee" : "vide";
}
