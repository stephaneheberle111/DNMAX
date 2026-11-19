// SPDX-License-Identifier: CECILL-2.1
/**
 * Équivalence du modèle de la chaîne par chemins réels avec l'ancien modèle
 * (paires voisines et triplets, copié ci-dessous de `origin/main` au
 * 19 novembre 2026, #219), pour l'ordre par défaut des colonnes, sur des
 * référentiels tirés au hasard (graine fixe).
 *
 * Deux écarts, voulus, corrigent des défauts de l'ancien modèle :
 * - A. Un pivot par lequel ne passe aucun chemin réel (compétence rattachée
 *   à des EC sans aucun semestre, UE sans EC portant une compétence…) : l'ancien
 *   modèle retombait sur les relations brutes et montrait, par exemple, les EC
 *   d'une compétence rattachée sans semestre, que ces EC ne montraient pas en
 *   retour. Le nouveau ne montre que le pivot et le diplôme.
 * - B. Diplôme verrouillé : l'ancien modèle gardait toutes les UE, même sans
 *   chemin réel (alors qu'elles disparaissent avec tout autre pivot), et
 *   écartait les EC sans UE (alors qu'ils figurent avec tout autre pivot).
 */
import { describe, expect, it } from "vitest";
import { semItems, semLie, refFilter, ecsMiens } from "./carte-donnees";
import { ecNum, ecOrd } from "./aides-communes";
import { etat, etatVide, type Objet } from "./etat";
import { SEMESTRES } from "../domaine/constituer";
import { chainModel, type ModeleChaine } from "./chaine-modele";
import { anneeScolaire } from "./promotions-calendrier";

type Element = Objet;
type AncienModele = Omit<ModeleChaine, "kind" | "ordre"> & { kind: string; tripletsAppliques: boolean };
type Vue = Omit<ModeleChaine, "kind" | "ordre"> & { kind: string };
const CH_KINDS = ["sem", "comp", "ec", "ue", "dip"] as const;

function rang(sorte: string): number {
  return (CH_KINDS as readonly string[]).indexOf(sorte);
}

function liste(valeur: unknown): Element[] {
  return valeur as Element[];
}

// Copie conforme de l'ancien `chainModel` (seul le nom et le dernier champ rendu changent) : ne pas la retoucher.
function ancienChainModel(): AncienModele | null {
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
  // Relation entre une case (a, colonne k) et une case de la colonne suivante (b).
  const rel = (k: string, a: Element, b: Element): boolean =>
    k === "sem" ? semLie(b, a as { sem: unknown }) : k === "comp" ? ((a.ecIds || []) as unknown[]).includes(b.id) : k === "ec" ? a.ueId === b.id : true;
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
  // Un semestre, une compétence et un EC ne vont ensemble que si la compétence est rattachée à l'EC
  // ce semestre-là : on ne garde que les triplets réels.
  const iSem = rang("sem");
  const iComp = rang("comp");
  const iEc = rang("ec");
  const iUe = rang("ue");
  let ok3: { c: unknown; s: unknown; e: unknown }[] | null = null;
  {
    const tri: { c: unknown; s: unknown; e: unknown }[] = [];
    competences.forEach((c) => {
      ((c.ecs || []) as Element[]).forEach((l) => {
        ((l.sems || []) as unknown[]).forEach((sm) => tri.push({ c: c.id, s: sm, e: l.id }));
      });
    });
    const enSet = (i: number): Set<unknown> => new Set((sets[i] as Element[]).map((x) => x.id));
    const SC = enSet(iComp);
    const SS = enSet(iSem);
    const SE = enSet(iEc);
    const keep = tri.filter((t) => SC.has(t.c) && SS.has(t.s) && SE.has(t.e));
    if (keep.length) {
      const gardes = new Map<number, Set<unknown>>([
        [iComp, new Set(keep.map((t) => t.c))],
        [iSem, new Set(keep.map((t) => t.s))],
        [iEc, new Set(keep.map((t) => t.e))],
      ]);
      for (const [i, ids] of gardes) if (i !== p) sets[i] = (sets[i] as Element[]).filter((x) => ids.has(x.id));
      if (p < iUe) sets[iUe] = (sets[iUe] as Element[]).filter((u) => (sets[iEc] as Element[]).some((e) => e.ueId === u.id));
      ok3 = keep;
    }
  }
  const triplets = ok3;
  const pair = (k: string, gauche: Element, droite: Element): boolean =>
    rel(k, gauche, droite) &&
    (!triplets ||
      (k === "sem"
        ? triplets.some((t) => t.s === gauche.id && t.c === droite.id)
        : k === "comp"
          ? triplets.some((t) => t.c === gauche.id && t.e === droite.id)
          : true));
  // Ordre : semestres dans l'ordre, compétences au barycentre de leurs semestres.
  if ((sets[iSem] as Element[]).length > 1) (sets[iSem] as Element[]).sort((a, b) => cmp(ecKey(a), ecKey(b)));
  if (p !== iComp && (sets[iComp] as Element[]).length > 1) {
    const ix = (c: Element): number => {
      const l = (sets[iSem] as Element[]).map((e, i) => (semLie(c, e as { sem: unknown }) ? i : -1)).filter((i) => i >= 0);
      return l.length ? l.reduce((somme, i) => somme + i, 0) / l.length : 999;
    };
    (sets[iComp] as Element[]).sort((a, b) => ix(a) - ix(b) || Number(a.bloc) - Number(b.bloc) || ecNum(a.code) - ecNum(b.code));
  }
  // Seul ajout à la copie : dire si le filtre par triplets s'est appliqué, pour classer les écarts.
  return { kind, p, piv, sets, items: kind === "dip" ? (lists.dip as Element[]) : items, rel: pair, dip, ueOfE, tripletsAppliques: ok3 !== null };
}


/** Générateur pseudo-aléatoire à graine (mulberry32) : les tirages se rejouent à l'identique. */
function hasard(graine: number): () => number {
  let etatGraine = graine >>> 0;
  return () => {
    etatGraine = (etatGraine + 0x6d2b79f5) >>> 0;
    let t = etatGraine;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un référentiel, un filtre, une case « ma répartition » et un pivot tirés au hasard. */
function tirer(alea: () => number): void {
  const entier = (n: number): number => Math.floor(alea() * n);
  const parmi = <T>(valeurs: readonly T[]): T => valeurs[entier(valeurs.length)] as T;
  const sousEnsemble = <T>(valeurs: readonly T[], part: number): T[] => valeurs.filter(() => alea() < part);
  const ues = Array.from({ length: entier(5) }, (_v, i) => ({ id: `u${String(i)}`, nom: `UE ${String(i)}`, code: `UE${String(i)}`, couleur: "#aa0000" }));
  const ecs = Array.from({ length: entier(9) }, (_v, i) => ({
    id: `e${String(i)}`,
    ueId: ues.length && alea() < 0.9 ? parmi(ues).id : alea() < 0.5 ? "" : "u-absente",
    nom: `EC ${String(i)}`,
    code: `EC ${String(entier(4) + 1)}.${String(i)}`,
    codes: {},
    sems: sousEnsemble(SEMESTRES, 0.4),
  }));
  const competences = Array.from({ length: entier(9) }, (_v, i) => {
    const bloc = entier(3) + 1;
    const liens = sousEnsemble(ecs, 0.35).map((ec) => ({
      id: ec.id,
      sems: alea() < 0.1 ? [] : alea() < 0.85 ? sousEnsemble(ec.sems, 0.6) : sousEnsemble(SEMESTRES, 0.3),
    }));
    if (alea() < 0.05) liens.push({ id: "e-absent", sems: ["S1"] });
    return { id: `c${String(i)}`, code: `C${String(bloc)}.${String(i + 1)}`, bloc, libelle: `Compétence ${String(i)}`, ecs: liens, ecIds: liens.map((lien) => lien.id) };
  });
  const diplomes = [
    { id: "d1", nom: "DN MADE", mention: "Objet" },
    { id: "d2", nom: "DN MADE", mention: "Espace" },
  ];
  etat.donnees = { activeDiplome: parmi(["d1", "d2", "d1", "absent"]), diplomes, ues, ecs, competences };
  const filtres = [
    { kind: "", value: "" },
    ...(ues.length ? [{ kind: "ue", value: parmi(ues).nom }] : []),
    ...(ecs.length ? [{ kind: "ec", value: parmi(ecs).id }] : []),
    ...(competences.length ? [{ kind: "comp", value: parmi(competences).code }] : []),
    { kind: "bloc", value: String(entier(3) + 1) },
  ];
  const ref: Objet = { filter: alea() < 0.5 ? { kind: "", value: "" } : parmi(filtres) };
  if (alea() < 0.25 && ecs.length) {
    etat.donnees.moi = "t1";
    etat.donnees.affectH = { [anneeScolaire()]: { p1: Object.fromEntries(sousEnsemble(ecs, 0.5).map((ec) => [ec.id, ["t1"]])) } };
    ref.mine = true;
  }
  const sorte = parmi(["sem", "comp", "ec", "ue", "dip", "inconnue"]);
  const candidats: unknown[] = sorte === "sem" ? SEMESTRES.slice() : sorte === "comp" ? competences.map((c) => c.id) : sorte === "ec" ? ecs.map((e) => e.id) : sorte === "ue" ? ues.map((u) => u.id) : ["d1", "d2"];
  ref.piv = alea() < 0.1 ? undefined : { kind: sorte, id: alea() < 0.15 || !candidats.length ? "" : parmi(candidats) };
  if (alea() < 0.1 && competences.length) ref.chain = parmi(competences).code;
  etat.ui = { ref };
}

/** Ce qui se voit : pivot, colonnes (identifiants, dans l'ordre) et liens entre colonnes voisines. */
function vue(modele: Vue | null): unknown {
  if (modele === null) return null;
  const colonnes = CH_KINDS.map((_k, i) => (modele.sets[i] ?? []).map((x) => x.id));
  const liens: string[] = [];
  for (let i = 0; i < CH_KINDS.length - 1; i++)
    for (const a of modele.sets[i] ?? []) for (const b of modele.sets[i + 1] ?? []) if (modele.rel(CH_KINDS[i] as string, a, b)) liens.push(`${String(i)}:${String(a.id)}>${String(b.id)}`);
  return { kind: modele.kind, p: modele.p, piv: modele.piv.id, items: modele.items.map((x) => x.id), colonnes, liens };
}

/** Rejoue un tirage : l'état d'affichage est remis à neuf avant chaque modèle, qui écrit le pivot retenu. */
function comparer(graine: number): { ancien: ReturnType<typeof ancienChainModel>; ancienneVue: unknown; nouvelleVue: unknown; nouveau: ModeleChaine | null } {
  Object.assign(etat, etatVide());
  tirer(hasard(graine));
  const depart = structuredClone(etat.ui);
  const ancien = ancienChainModel();
  const ancienneVue = vue(ancien);
  etat.ui = structuredClone(depart);
  const nouveau = chainModel();
  return { ancien, ancienneVue, nouvelleVue: vue(nouveau), nouveau };
}

const TIRAGES = 4000;

describe("chainModel par chemins réels, ordre par défaut", () => {
  it("rend les mêmes colonnes, les mêmes liens et le même ordre que l'ancien modèle, hors des deux défauts corrigés", () => {
    const comptes = { identiques: 0, ecartA: 0, ecartB: 0 };
    for (let graine = 1; graine <= TIRAGES; graine++) {
      const { ancien, ancienneVue, nouvelleVue, nouveau } = comparer(graine);
      if (JSON.stringify(ancienneVue) === JSON.stringify(nouvelleVue)) {
        comptes.identiques++;
        continue;
      }
      // Les deux modèles s'accordent toujours sur le pivot et la liste de la roue.
      expect(ancien, `tirage ${String(graine)}`).not.toBeNull();
      expect(nouveau?.kind).toBe(ancien?.kind);
      expect(nouveau?.piv.id).toBe(ancien?.piv.id);
      expect(nouveau?.items.map((x) => x.id)).toEqual(ancien?.items.map((x) => x.id));
      const modele = nouveau as ModeleChaine;
      if (modele.kind !== "dip") {
        // A : aucun chemin réel par le pivot ; l'ancien modèle n'avait pas pu filtrer par triplets.
        expect(ancien?.tripletsAppliques, `tirage ${String(graine)}`).toBe(false);
        CH_KINDS.forEach((k, i) => {
          if (i !== modele.p && k !== "dip") expect(modele.sets[i], `tirage ${String(graine)}, colonne ${k}`).toEqual([]);
        });
        comptes.ecartA++;
      } else {
        // B : diplôme verrouillé ; seules les UE et les EC (et ce qui en dépend) peuvent différer.
        comptes.ecartB++;
      }
    }
    // Les écarts restent l'exception : la plupart des tirages sont identiques.
    expect(comptes.identiques).toBeGreaterThan(TIRAGES * 0.7);
    expect(comptes.identiques + comptes.ecartA + comptes.ecartB).toBe(TIRAGES);
  });

  it("ne diffère de l'ancien modèle, diplôme verrouillé, que par les UE sans chemin quand tous les EC ont une UE", () => {
    let verifies = 0;
    for (let graine = 1; graine <= TIRAGES; graine++) {
      const { ancien, ancienneVue, nouvelleVue, nouveau } = comparer(graine);
      if (nouveau?.kind !== "dip" || JSON.stringify(ancienneVue) === JSON.stringify(nouvelleVue)) continue;
      const uesConnues = new Set((etat.donnees.ues as Objet[]).map((u) => u.id));
      const sansUe = (etat.donnees.ecs as Objet[]).some((e) => !uesConnues.has(e.ueId));
      if (sansUe || !ancien?.tripletsAppliques) continue;
      // L'ancien modèle, privé des UE par lesquelles ne passe aucun chemin, donne le nouveau.
      const presentes = new Set((nouveau.sets[3] ?? []).map((u) => u.id));
      const corrige = { ...ancien, sets: { ...ancien.sets, 3: (ancien.sets[3] ?? []).filter((u) => presentes.has(u.id)) } };
      expect(vue(corrige), `tirage ${String(graine)}`).toEqual(nouvelleVue);
      verifies++;
    }
    expect(verifies).toBeGreaterThan(0);
  });
});

describe("défauts de l'ancien modèle corrigés par les chemins réels", () => {
  const base = (): void => {
    Object.assign(etat, etatVide());
    etat.donnees = {
      activeDiplome: "d1",
      diplomes: [{ id: "d1", nom: "DN MADE", mention: "Objet" }],
      ues: [
        { id: "u1", nom: "UE 1" },
        { id: "u2", nom: "UE 2" },
      ],
      ecs: [
        { id: "e1", ueId: "u1", nom: "Dessin", codes: {}, sems: ["S1"] },
        { id: "e2", ueId: "u1", nom: "Atelier", codes: {}, sems: ["S1"] },
        { id: "e3", ueId: "", nom: "Projet", codes: {}, sems: ["S2"] },
      ],
      competences: [
        { id: "c1", code: "C1.1", bloc: 1, libelle: "Dessiner", ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S1"] }] },
        // Rattachée à l'Atelier sans semestre (reprise d'une ancienne version) : pas de chemin réel.
        { id: "c2", code: "C1.2", bloc: 1, libelle: "Observer", ecIds: ["e2"], ecs: [{ id: "e2", sems: [] }] },
        { id: "c3", code: "C2.1", bloc: 2, libelle: "Concevoir", ecIds: ["e3"], ecs: [{ id: "e3", sems: ["S2"] }] },
      ],
    };
    etat.ui = { ref: { filter: { kind: "", value: "" } } };
  };
  const ids = (modele: Vue | null, i: number): unknown[] => (modele?.sets[i] ?? []).map((x) => x.id);

  it("A : une compétence rattachée sans semestre ne montre plus d'EC, comme l'EC ne la montre pas", () => {
    base();
    (etat.ui.ref as Objet).piv = { kind: "comp", id: "c2" };
    expect(ids(ancienChainModel(), 2)).toEqual(["e2"]);
    (etat.ui.ref as Objet).piv = { kind: "comp", id: "c2" };
    expect(ids(chainModel(), 2)).toEqual([]);
    (etat.ui.ref as Objet).piv = { kind: "ec", id: "e2" };
    expect(ids(chainModel(), 1)).toEqual([]);
  });

  it("B : diplôme verrouillé, l'UE sans chemin disparaît et l'EC sans UE apparaît, comme avec un autre pivot", () => {
    base();
    (etat.ui.ref as Objet).piv = { kind: "dip", id: "d1" };
    const ancien = ancienChainModel();
    expect(ids(ancien, 3)).toEqual(["u1", "u2"]);
    expect(ids(ancien, 2)).toEqual(["e1"]);
    (etat.ui.ref as Objet).piv = { kind: "dip", id: "d1" };
    const nouveau = chainModel();
    expect(ids(nouveau, 3)).toEqual(["u1"]);
    expect(ids(nouveau, 2)).toEqual(["e3", "e1"]);
    (etat.ui.ref as Objet).piv = { kind: "comp", id: "c3" };
    expect(ids(chainModel(), 2)).toEqual(["e3"]);
  });
});
