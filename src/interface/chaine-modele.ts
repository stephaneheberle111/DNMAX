// SPDX-License-Identifier: CECILL-2.1
/**
 * Modèle de la carte heuristique (chaîne) : cinq colonnes (compétence,
 * semestre, EC, UE, diplôme), l'une verrouillée en roue sur un pivot, les
 * autres réduites à ce qui lui est associé, dans le respect du filtre des
 * tuiles ; texte et hauteur de chaque case.
 *
 * Repris du fichier historique (décision 38) à l'identique, ordre des tris
 * compris. Le dessin de la chaîne reste dans ce fichier (0.9.2) et appelle
 * ces fonctions par leur ancien nom, publié sur la fenêtre.
 */
import { semItems, semLie, refFilter, ecName, ecsMiens } from "./carte-donnees";
import { ecNum, ecOrd } from "./aides-communes";
import { ecCodeLbl } from "./donnees";
import { etat, type Objet } from "./etat";
import { SEMESTRES } from "../domaine/constituer";

/** Les cinq colonnes de la chaîne, de gauche à droite. */
export const CH_KINDS = ["comp", "sem", "ec", "ue", "dip"] as const;

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
  kind: string;
  p: number;
  piv: Element;
  sets: Record<number, Element[]>;
  items: Element[];
  rel(sorte: string, gauche: Element, droite: Element): boolean;
  dip: Element;
  ueOfE(ec: Element | null | undefined): Element | null;
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
  const rel = (k: string, a: Element, b: Element): boolean =>
    k === "comp" ? semLie(a, b as { sem: unknown }) : k === "sem" ? ((b.sems || []) as unknown[]).includes(a.sem) : k === "ec" ? a.ueId === b.id : true;
  // Pivot.
  const old = (carte.piv as Element | undefined) || { kind: "comp", id: "" };
  let kind: string = (CH_KINDS as readonly string[]).includes(old.kind as string) ? (old.kind as string) : "comp";
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
  // Colonnes associées.
  const p = (CH_KINDS as readonly string[]).indexOf(kind);
  const sets: Record<number, Element[]> = {};
  sets[p] = [piv];
  for (let i = p + 1; i < CH_KINDS.length; i++) {
    const k = CH_KINDS[i] as string;
    const prev = sets[i - 1] as Element[];
    const pk = CH_KINDS[i - 1] as string;
    sets[i] = k === "dip" ? [dip] : (lists[k] as Element[]).filter((b) => prev.some((a) => rel(pk, a, b)));
  }
  for (let i = p - 1; i >= 0; i--) {
    const k = CH_KINDS[i] as string;
    const nxt = sets[i + 1] as Element[];
    sets[i] = (lists[k] as Element[]).filter((a) => nxt.some((b) => rel(k, a, b)));
  }
  // Le semestre est commun à tous les EC : on ne garde que les triplets compétence–semestre–EC réels.
  let ok3: { c: unknown; s: unknown; e: unknown }[] | null = null;
   
  if (sets[0] && sets[1] && sets[2]) {
    const tri: { c: unknown; s: unknown; e: unknown }[] = [];
    competences.forEach((c) => {
      ((c.ecs || []) as Element[]).forEach((l) => {
        ((l.sems || []) as unknown[]).forEach((sm) => tri.push({ c: c.id, s: sm, e: l.id }));
      });
    });
    const S0 = new Set(sets[0].map((x) => x.id));
    const S1 = new Set(sets[1].map((x) => x.id));
    const S2 = new Set(sets[2].map((x) => x.id));
    const keep = tri.filter((t) => S0.has(t.c) && S1.has(t.s) && S2.has(t.e));
    if (keep.length) {
      const k = [new Set<unknown>(), new Set<unknown>(), new Set<unknown>()] as const;
      keep.forEach((t) => {
        k[0].add(t.c);
        k[1].add(t.s);
        k[2].add(t.e);
      });
      [0, 1, 2].forEach((i) => {
        if (i !== p) sets[i] = (sets[i] as Element[]).filter((x) => (k[i as 0 | 1 | 2]).has(x.id));
      });
      if (p < 3) sets[3] = (sets[3] as Element[]).filter((u) => (sets[2] as Element[]).some((e) => e.ueId === u.id));
      ok3 = keep;
    }
  }
  const triplets = ok3;
  const pair = (k: string, gauche: Element, droite: Element): boolean =>
    rel(k, gauche, droite) &&
    (!triplets ||
      (k === "comp" ? triplets.some((t) => t.c === gauche.id && t.s === droite.id) : k === "sem" ? triplets.some((t) => t.s === gauche.id && t.e === droite.id) : true));
  // Ordre : hiérarchique, compétences au barycentre de leurs semestres.
  if ((sets[1] as Element[]).length > 1) (sets[1] as Element[]).sort((a, b) => cmp(ecKey(a), ecKey(b)));
  if (p !== 0 && (sets[0] as Element[]).length > 1) {
    const ix = (c: Element): number => {
      const l = (sets[1] as Element[]).map((e, i) => (semLie(c, e as { sem: unknown }) ? i : -1)).filter((i) => i >= 0);
      return l.length ? l.reduce((somme, i) => somme + i, 0) / l.length : 999;
    };
    (sets[0] as Element[]).sort((a, b) => ix(a) - ix(b) || Number(a.bloc) - Number(b.bloc) || ecNum(a.code) - ecNum(b.code));
  }
  return { kind, p, piv, sets, items: kind === "dip" ? (lists.dip as Element[]) : items, rel: pair, dip, ueOfE };
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

/** Pose ces fonctions et constantes sur `cible` (la fenêtre) sous leurs noms historiques. */
export function publierChaineModele(cible: Record<string, unknown>): void {
  Object.assign(cible, { chainModel, chainItemText, chainNode, CH_KINDS: [...CH_KINDS], CH_LBL: { ...CH_LBL } });
}
