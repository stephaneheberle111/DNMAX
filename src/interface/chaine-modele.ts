// SPDX-License-Identifier: CECILL-2.1
/**
 * Modèle de la carte heuristique (chaîne) : cinq colonnes (par défaut
 * semestre, compétence, EC, UE, diplôme, dans l'ordre choisi par
 * l'enseignant), l'une verrouillée en roue sur un pivot, les autres réduites
 * à ce qu'un chemin réel relie au pivot, dans le respect du filtre des
 * tuiles ; texte et hauteur de chaque case.
 *
 * Les chemins réels (semestre, compétence, EC, UE, diplôme) et leur lecture
 * sont dans `domaine/chaine`. Pour l'ordre par défaut, le résultat est celui
 * de l'ancien modèle par paires voisines et triplets (test d'équivalence),
 * hormis les défauts corrigés décrits dans `chaine-modele.test.ts`.
 */
import { semItems, semLie, refFilter, ecName, ecsMiens } from "./carte-donnees";
import { ecNum, ecOrd } from "./aides-communes";
import { ecCodeLbl } from "./donnees";
import { etat, type Objet } from "./etat";
import { SEMESTRES } from "../domaine/constituer";
import { cheminsReels, estSorteChaine, passagesParLePivot, SORTES_CHAINE, type SorteChaine } from "../domaine/chaine";
import { ordonnerParBarycentre } from "../domaine/chaine-barycentre";
import { ordreChaine } from "../domaine/preferences";

/** Les cinq colonnes de la chaîne dans l'ordre par défaut, de gauche à droite : le semestre d'abord, demande de l'auteur. */
export const CH_KINDS = SORTES_CHAINE;

/** Libellé de chaque colonne. */
export const CH_LBL: Readonly<Record<string, string>> = {
  comp: "Compétence",
  sem: "Semestre",
  ec: "Enseignement constitutif",
  ue: "Unité d'enseignement",
  dip: "Diplôme",
};

type Element = Objet;

/** Ce que rend `chainModel` : pivot, colonnes, et la relation qui relie deux cases voisines. */
export interface ModeleChaine {
  kind: SorteChaine;
  p: number;
  piv: Element;
  sets: Record<number, Element[]>;
  items: Element[];
  rel(sorte: string, gauche: Element, droite: Element): boolean;
  dip: Element;
  ueOfE(ec: Element | null | undefined): Element | null;
  /** Ordre des colonnes, retenu dans les préférences. */
  ordre: SorteChaine[];
}

function liste(valeur: unknown): Element[] {
  return valeur as Element[];
}

/**
 * Construit le modèle de la chaîne pour le référentiel actif. Le pivot
 * retenu est écrit dans `ui.ref.piv` ; rend `null` s'il n'y a rien à montrer.
 */
export function chainModel(): ModeleChaine | null {
  const D = etat.donnees;
  const carte = etat.ui.ref as Objet;
  const f = refFilter();
  const competences = liste(D.competences);
  const ecs = liste(D.ecs);
  const ues = liste(D.ues);
  const diplomes = liste(D.diplomes);
  const dip = diplomes.find((x) => x.id === D.activeDiplome) || { id: "", nom: "Diplôme", mention: "" };
  const uIdx = (id: unknown): number => ues.findIndex((u) => u.id === id);
  const ueOfE = (e: Element | null | undefined): Element | null => (e ? ues.find((u) => u.id === e.ueId) || null : null);
  // Ensembles autorisés par le filtre des tuiles.
  let A: Record<string, Set<unknown>> | null = null;
  if (f.kind) {
    let C: Element[] = [];
    let E: Element[] = [];
    let U: Element[] = [];
    const compsOfE = (es: Element[]): Element[] => competences.filter((c) => ((c.ecIds || []) as unknown[]).some((x) => es.some((e) => e.id === x)));
    const ecsOfC = (cs: Element[]): Element[] => ecs.filter((e) => cs.some((c) => (c.ecIds as unknown[]).includes(e.id)));
    const up = (es: Element[]): void => {
      U = ues.filter((u) => es.some((e) => e.ueId === u.id));
    };
    if (f.kind === "ue") {
      U = ues.filter((u) => u.nom === f.value);
      E = ecs.filter((e) => U.some((u) => u.id === e.ueId));
      C = compsOfE(E);
    } else if (f.kind === "ec") {
      E = ecs.filter((e) => e.id === f.value);
      up(E);
      C = compsOfE(E);
    } else if (f.kind === "comp") {
      C = competences.filter((c) => c.code === f.value);
      E = ecsOfC(C);
      up(E);
    } else if (f.kind === "bloc") {
      C = competences.filter((c) => String(c.bloc) === f.value);
      E = ecsOfC(C);
      up(E);
    }
    const S2 = semItems(E).filter((x) => C.some((c) => semLie(c, x)));
    A = { comp: new Set(C.map((x) => x.id)), sem: new Set(S2.map((x) => x.id)), ec: new Set(E.map((x) => x.id)), ue: new Set(U.map((x) => x.id)) };
  }
  const autorises = A;
  const ok = (k: string, x: Element): boolean => !autorises || k === "dip" || (autorises[k] as Set<unknown>).has(x.id);
  const ecKey = (x: Element): number[] => [(SEMESTRES as readonly string[]).indexOf(x.sem as string)];
  const cmp = (a: number[], b: number[]): number => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return (a[i] as number) - (b[i] as number);
    return 0;
  };
  const lists: Record<string, Element[]> = {
    comp: competences.slice().sort((a, b) => Number(a.bloc) - Number(b.bloc) || ecNum(a.code) - ecNum(b.code)),
    sem: semItems(ecs),
    ec: ecs.slice().sort((a, b) => uIdx(a.ueId) - uIdx(b.ueId) || ecOrd(a) - ecOrd(b)),
    ue: ues.slice(),
    dip: diplomes.slice(),
  };
  Object.keys(lists).forEach((k) => (lists[k] = (lists[k] as Element[]).filter((x) => ok(k, x))));
  // « Seulement ma répartition » : mes EC, les compétences qu'ils portent, leurs UE et leurs semestres.
  const miens = ecsMiens();
  if (miens !== null) {
    lists.ec = (lists.ec as Element[]).filter((e) => miens.has(e.id as string));
    lists.comp = (lists.comp as Element[]).filter((c) => ((c.ecIds || []) as string[]).some((id) => miens.has(id)));
    lists.ue = (lists.ue as Element[]).filter((u) => (lists.ec as Element[]).some((e) => e.ueId === u.id));
    const semestres = new Set(semItems(lists.ec).map((x) => x.id));
    lists.sem = (lists.sem as Element[]).filter((x) => semestres.has(x.id as string));
  }
  // Pivot.
  const old = (carte.piv as Element | undefined) || { kind: "comp", id: "" };
  let kind: SorteChaine = estSorteChaine(old.kind) ? old.kind : "comp";
  if (!old.id && kind === "comp" && carte.chain) {
    const c = competences.find((x) => x.code === carte.chain);
    if (c) old.id = c.id;
  }
  let items = lists[kind] as Element[];
  if (!items.length) {
    kind = "comp";
    items = lists.comp as Element[];
  }
  // Comme l'historique : une liste vide donne un pivot absent, d'où « rien à montrer ».
  const piv = kind === "dip" ? dip : (items.find((x) => x.id === old.id) || (items[0]));
  if (!piv) return null;
  carte.piv = { kind, id: piv.id };
  // Chemins réels qui passent par le pivot : ils donnent les cases de chaque colonne et les liens.
  const ordre = ordreChaine(etat.preferences);
  const ueParEc = new Map(ecs.map((e) => [String(e.id), e.ueId]));
  const retenus = (k: string): Set<unknown> => new Set((lists[k] as Element[]).map((x) => x.id));
  const chemins = cheminsReels({
    competences,
    retenus: { sem: retenus("sem"), comp: retenus("comp"), ec: retenus("ec"), ue: retenus("ue") },
    ueDe: (id) => ueParEc.get(id),
    diplome: String(dip.id),
  });
  const passages = passagesParLePivot(chemins, ordre, kind, String(piv.id));
  const p = ordre.indexOf(kind);
  const sets: Record<number, Element[]> = {};
  ordre.forEach((k, i) => {
    sets[i] = i === p ? [piv] : k === "dip" ? [dip] : (lists[k] as Element[]).filter((x) => passages.presents[k].has(String(x.id)));
  });
  const pair = (k: string, gauche: Element, droite: Element): boolean => {
    const i = (ordre as string[]).indexOf(k);
    return i >= 0 && i < ordre.length - 1 && passages.relie(i, String(gauche.id), String(droite.id));
  };
  // Ordre des cases : semestres dans l'ordre chronologique ; les autres colonnes partent de l'ordre de leur liste
  // (compétences par bloc puis code, EC par UE puis code, UE du référentiel) et se rangent au barycentre de leurs
  // voisins reliés, de proche en proche, pour croiser le moins de liens possible.
  const iSem = ordre.indexOf("sem");
  if ((sets[iSem] as Element[]).length > 1) (sets[iSem] as Element[]).sort((a, b) => cmp(ecKey(a), ecKey(b)));
  const parId = ordre.map((_k, i) => new Map((sets[i] as Element[]).map((x) => [String(x.id), x])));
  const rangees = ordonnerParBarycentre(
    ordre.map((_k, i) => (sets[i] as Element[]).map((x) => String(x.id))),
    (rang, gauche, droite) => passages.relie(rang, gauche, droite),
    new Set([p, iSem]),
  );
  rangees.forEach((ids, i) => {
    sets[i] = ids.map((id) => (parId[i] as Map<string, Element>).get(id) as Element);
  });
  return { kind, p, piv, sets, items: kind === "dip" ? (lists.dip as Element[]) : items, rel: pair, dip, ueOfE, ordre };
}

/** Code et libellé d'une case de la chaîne, selon sa colonne. */
export function chainItemText(k: string, x: Element): { code: unknown; label: unknown } {
  if (k === "comp") return { code: x.code, label: x.libelle || x.code };
  if (k === "sem") return { code: "", label: "Semestre " + String(x.num) + " · année " + String(x.annee) };
  if (k === "ec") return { code: ecCodeLbl(x), label: ecName(x) };
  if (k === "ue") return { code: x.code || "", label: x.nom };
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
  return { code: "", label: String(x.nom || "Aucun diplôme") + (x.mention ? " · mention " + String(x.mention) : "") };
}

/** Case de la chaîne avec sa hauteur : lignes de texte, code au-dessus, sous-titre au-dessous, 34 au moins. */
export function chainNode<T extends { code?: unknown; t: unknown[]; sub?: unknown }>(o: T): T & { h: number } {
  const lh = 12.5;
  const pad = 9;
  const h = Math.max(34, (o.code ? 13 : 0) + o.t.length * lh + (o.sub ? 13 : 0) + pad * 2 - 4);
  return { ...o, h };
}
