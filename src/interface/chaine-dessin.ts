// SPDX-License-Identifier: CECILL-2.1
/**
 * Dessin et gestes de la carte heuristique (chaîne) : cinq colonnes, l'une
 * verrouillée en roue sur un pivot, les autres reliées à lui ; cases, liens,
 * en-têtes à cadenas, roue du pivot (molette, flèches, saisie d'un filtre),
 * survol qui éclaire ce qui est relié et codes des EC au survol d'un semestre.
 * Les colonnes changent d'ordre en glissant leur en-tête (ou au clavier,
 * flèches sur l'en-tête) ; la chaîne se montre en colonnes côte à côte ou en
 * rangées superposées (ruban horizontal pour pivot). Ordre et sens sont retenus dans
 * les préférences.
 *
 * Repris du fichier historique (décision 38) à l'identique : mêmes calculs,
 * même ordre d'appels, mêmes écouteurs. Le balisage reste écrit en chaînes,
 * caractère pour caractère comme avant (attributs, ordre, espaces, arrondis
 * `toFixed`), pour que le dessin se vérifie au pixel près contre l'ancien ;
 * chaque valeur variable y passe par `esc`, comme avant. Le modèle (pivot,
 * colonnes, relations) est dans `interface/chaine-modele`.
 */
import "./chaine.css";
import { wrapN } from "../domaine/carte-geometrie";
import { estOrdreParDefaut, placerColonne, SORTES_CHAINE, type SorteChaine } from "../domaine/chaine";
import { chaineVerticale } from "../domaine/preferences";
import { esc } from "./aides-communes";
import { ecName, refFilter } from "./carte-donnees";
import { CH_LBL, chainItemText, chainModel, chainNode, type ModeleChaine } from "./chaine-modele";
import { norm } from "./constantes";
import { anneeCode, ecCodeAt, ecCodeShort, saveData, savePrefs } from "./donnees";
import { etat, type Objet } from "./etat";
import { peindreReferentiel } from "./referentiel";

/** Hauteur minimale de la roue du pivot, en pixels. */
export const CH_WH = 236;

/** Case de la chaîne, telle que le dessin la place (`y`, `cy`) une fois sa hauteur connue. */
export interface CaseChaine {
  id: string;
  kind: string;
  sel?: unknown;
  col?: string;
  x: number;
  y: number;
  h: number;
  cy?: number;
  code?: unknown;
  t: unknown[];
  sub?: string;
  strong?: boolean;
  piv?: boolean;
}

/** Élément proposé par la roue : identifiant, couleur, code et libellé. */
export interface ElementRoue {
  id: unknown;
  col?: string;
  strong?: boolean;
  code?: unknown;
  label?: unknown;
}

let documentCourant: Document | null = null;

function page(): Document {
  if (documentCourant === null) throw new Error("chaîne : document absent");
  return documentCourant;
}

function carte(): Objet {
  return etat.ui.ref as Objet;
}

/** Balisage SVG d'une case : code, lignes du libellé, sous-titre coupé à 32 caractères. */
export function chainSvgNode(o: CaseChaine, w: number): string {
  const lh = 12.5,
    pad = 9;
  let ty = o.y + pad + 6,
    t = "";
  if (o.code) {
    t += `<text class="ccode" x="${String(o.x + 12)}" y="${ty.toFixed(1)}">${esc(o.code)}</text>`;
    ty += 13;
  }
  o.t.forEach((l) => {
    t += `<text class="cn${o.strong ? " b" : ""}" x="${String(o.x + 12)}" y="${ty.toFixed(1)}">${esc(l)}</text>`;
    ty += lh;
  });
  if (o.sub) {
    const sb = o.sub.length > 32 ? o.sub.slice(0, 31).trim() + "…" : o.sub;
    t += `<text class="cs" x="${String(o.x + 12)}" y="${(ty + 1).toFixed(1)}">${esc(sb)}</text>`;
  }
  // `id`, `data-node` et `data-kind` ne sont pas échappés : c'était déjà le cas (rendu gardé à l'identique).
  return `<g class="cnode" id="${o.id}" data-node="${o.id}" data-kind="${o.kind}" data-sel="${esc(o.sel)}" data-code0="${esc(o.code || "")}" tabindex="0">
    <rect x="${String(o.x)}" y="${o.y.toFixed(1)}" width="${String(w)}" height="${o.h.toFixed(1)}" rx="7" class="cbox" style="--c:${esc(o.col)}"/>
    <rect x="${String(o.x)}" y="${o.y.toFixed(1)}" width="4" height="${o.h.toFixed(1)}" rx="2" fill="${esc(o.col)}"/>
    ${t}</g>`;
}

/**
 * Balisage de la chaîne pour le référentiel actif et le filtre des tuiles,
 * ou un message si rien ne correspond au filtre. Le pivot retenu est écrit
 * dans `ui.ref.piv` (par `chainModel`).
 */
export function paintChain(): string {
  // Appelé pour son effet, comme avant : un filtre inconnu est remis à vide avant le modèle.
  refFilter();
  const M = chainModel();
  if (!M) return `<div class="empty">Aucun élément ne correspond au filtre.</div>`;
  if (chaineVerticale(etat.preferences)) return paintChainVerticale(M);
  const { kind, p, piv, sets } = M;
  const ordre = M.ordre;
  const CW = 172,
    // La colonne des EC est plus large : son en-tête « Enseignement constitutif » ne tiendrait pas sur une ligne dans 172.
    CW_EC = 212,
    CWP = 238,
    GAP = 30,
    PADX = 10,
    TOP = 44,
    VG = 11;
  const widths = ordre.map((k, i) => (i === p ? CWP : k === "ec" ? CW_EC : CW));
  const X = (i: number): number => PADX + widths.slice(0, i).reduce((a, w) => a + w + GAP, 0);
  const LAST = ordre.length - 1,
    W = X(LAST) + (widths[LAST] as number) + PADX;
  const nid = (k: string, x: Objet): string => k + ":" + String(x.id);
  const semFix = semestreFixe(M);
  const node = (k: string, x: Objet, i: number): CaseChaine => caseChaine(k, x, X(i), semFix, COUPES_COLONNES);
  // pivot : roue seule, assez haute pour l'intitulé complet de l'élément sélectionné
  const pt = chainItemText(kind, piv);
  const cpl = pt.code ? 24 : 31,
    fullH = wrapN(pt.label, cpl, 30).length * 17 + 12;
  const WH = Math.max(CH_WH, fullH + 150);
  const cols = ordre.map((k, i) => (i === p ? null : (sets[i] as Objet[]).map((x) => node(k, x, i))));
  const pivN = { id: nid(kind, piv), kind, h: WH, piv: true, x: X(p) } as CaseChaine;
  const colN = (i: number): CaseChaine[] => (i === p ? [pivN] : (cols[i] as CaseChaine[]));
  const anchor = (n: CaseChaine): number => (n.piv ? n.y + WH / 2 : n.y + n.h / 2);
  // colonne de base : la plus haute hors pivot
  const tall = (i: number): number => colN(i).reduce((a, n) => a + n.h + VG, 0);
  const base = ordre.map((_k, i) => i)
    .filter((i) => i !== p)
    .sort((a, b) => tall(b) - tall(a))[0] as number;
  let y = TOP;
  colN(base).forEach((n) => {
    n.y = y;
    y += n.h + VG;
  });
  const linked = (i: number, n: CaseChaine, j: number): CaseChaine[] => {
    // nœuds de la colonne j liés à n (colonne i)
    const lo = Math.min(i, j),
      k = ordre[lo] as string;
    return colN(j).filter((m) => {
      const a = lo === i ? n : m,
        b = lo === i ? m : n;
      const A = a.piv ? piv : (sets[lo] as Objet[]).find((x) => nid(ordre[lo] as string, x) === a.id),
        B = b.piv ? piv : (sets[lo + 1] as Objet[]).find((x) => nid(ordre[lo + 1] as string, x) === b.id);
      return A && B && M.rel(k, A, B);
    });
  };
  const placeCol = (i: number, ref: number): void => {
    let prev = -1e9;
    colN(i).forEach((n) => {
      const ls = linked(i, n, ref);
      const want = ls.length ? ls.reduce((a, m) => a + anchor(m), 0) / ls.length : prev + n.h / 2;
      let top = n.piv ? want - WH / 2 : want - n.h / 2;
      if (top < prev + VG) top = prev + VG;
      n.y = top;
      prev = top + n.h;
    });
  };
  for (let i = base + 1; i < ordre.length; i++) placeCol(i, i - 1);
  for (let i = base - 1; i >= 0; i--) placeCol(i, i + 1);
  const all = ordre.flatMap((_k, i) => colN(i));
  const minY = Math.min(...all.map((n) => n.y));
  all.forEach((n) => (n.y += TOP - minY));
  all.forEach((n) => {
    n.cy = anchor(n);
  });
  const H = Math.max(...all.map((n) => n.y + n.h)) + 22;
  // liens
  const links: { a: CaseChaine; b: CaseChaine; col: string | undefined }[] = [];
  for (let i = 0; i < ordre.length - 1; i++)
    colN(i).forEach((a) => {
      linked(i, a, i + 1).forEach((b) => links.push({ a, b, col: b.piv ? a.col || "#9aa2ae" : b.col }));
    });
  const path = (l: { a: CaseChaine; b: CaseChaine; col: string | undefined }): string => {
    const x1 = l.a.x + (widths[(ordre as readonly string[]).indexOf(l.a.kind)] as number),
      y1 = l.a.cy as number,
      x2 = l.b.x,
      y2 = l.b.cy as number,
      mx = (x1 + x2) / 2;
    return `<path class="clink" data-link="${esc(l.a.id)}|${esc(l.b.id)}" d="M${String(x1)} ${y1.toFixed(1)}C${String(mx)} ${y1.toFixed(1)} ${String(mx)} ${y2.toFixed(1)} ${String(x2)} ${y2.toFixed(1)}" stroke="${esc(l.col || "#9aa2ae")}"/>`;
  };
  const lock = cadenas;
  return `<div class="tw"><div class="chainbox" style="width:${String(W)}px;height:${H.toFixed(0)}px">
    <svg class="chain" width="${String(W)}" height="${H.toFixed(0)}" viewBox="0 0 ${String(W)} ${H.toFixed(0)}">
      ${ordre.map((_k, i) => `<rect class="ccol${i % 2 ? " alt" : ""}${i === p ? " piv" : ""}" x="${String(X(i) - 9)}" y="34" width="${String((widths[i] as number) + 18)}" height="${(H - 40).toFixed(0)}" rx="10"/>`).join("")}
      <g class="links">${links.map(path).join("")}</g>
      ${ordre.flatMap((_k, i) => (i === p ? [] : (cols[i] as CaseChaine[]).map((n) => chainSvgNode(n, widths[i] as number)))).join("")}
    </svg>
    ${ordre.map(
      (k, i) => `<button type="button" class="chh${i === p ? " on" : ""}" data-lock="${k}" style="left:${String(X(i) - 9)}px;width:${String((widths[i] as number) + 18)}px"
        aria-pressed="${String(i === p)}" title="${i === p ? "Colonne verrouillée" : "Verrouiller cette colonne"}" ${attributsEnTete(k, i)}>${lock(i === p)}<span>${esc(CH_LBL[k])}</span><b>${String(i === p ? M.items.length : (sets[i] as Objet[]).length)}</b></button>`,
    ).join("")}
    <div class="chpiv" style="left:${String(X(p))}px;top:${pivN.y.toFixed(0)}px;width:${String(CWP)}px">
      <div class="wheel tall" id="chainWheel" tabindex="0" role="listbox" aria-label="${esc(CH_LBL[kind])}" style="height:${String(WH)}px"
        title="Molette ou flèches pour parcourir · clic ou Entrée pour sélectionner · tape du texte pour filtrer">
        <div class="wband"></div><div class="wstage"></div>
        <div class="wfade t"></div><div class="wfade b"></div>
        <div class="whint" hidden>molette ou flèches pour en changer</div>
        <div class="wq" hidden></div>
      </div>
    </div>
    <div class="chlive" role="status" aria-live="polite"></div>
  </div></div>`;
}

/** Longueur maximale d'une ligne de libellé, par sorte de case : colonnes côte à côte (cases de 172, 212 pour les EC) ou rangées (cases de 150). */
type Coupes = Readonly<Record<string, number>>;
const COUPES_COLONNES: Coupes = { comp: 31, ec: 31, ue: 25, dip: 30 };
const COUPES_RANGEES: Coupes = { comp: 26, ec: 21, ue: 21, dip: 25 };

/** Un seul semestre en vue (colonne verrouillée dessus, ou réduite à un seul) : les EC portent son code ; sinon vide. */
function semestreFixe(M: ModeleChaine): string {
  const iSem = (M.ordre as string[]).indexOf("sem");
  return M.kind === "sem" ? (M.piv.sem as string) : (M.sets[iSem] || []).length === 1 ? (((M.sets[iSem] as Objet[])[0] as Objet).sem as string) : "";
}

/** Case de la chaîne (sans position le long de sa colonne) : couleur, code, libellé coupé selon `coupes`, hauteur. */
function caseChaine(k: string, x: Objet, abscisse: number, semFix: string, coupes: Coupes): CaseChaine {
  const nid = k + ":" + String(x.id);
  const col = k === "comp" ? "#10555F" : k === "dip" ? "#7c8698" : (x.couleur as string) || "#9aa2ae";
  let o = { id: nid, kind: k, sel: x.id, col, x: abscisse } as Omit<CaseChaine, "y" | "h">;
  if (k === "comp") o = Object.assign(o, { code: x.code, t: wrapN(x.libelle || x.code, coupes.comp as number, 3) });
  else if (k === "sem") o = Object.assign(o, { t: ["Semestre " + String(x.num)], sub: "Année " + String(x.annee) + " · " + anneeCode(x.annee as number), strong: true });
  else if (k === "ec") o = Object.assign(o, { code: semFix ? ecCodeAt(x, semFix) || "—" : ecCodeShort(x), t: wrapN(ecName(x), coupes.ec as number, 3) });
  else if (k === "ue") o = Object.assign(o, { t: wrapN(x.nom, coupes.ue as number, 3), sub: (x.code as string) || "" });
  else o = Object.assign(o, { t: wrapN(chainItemText("dip", x).label, coupes.dip as number, 2), strong: true });
  return chainNode(o) as CaseChaine;
}

/** Cadenas d'un en-tête, fermé sur la colonne verrouillée. */
function cadenas(on: boolean): string {
  return `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.6" fill="currentColor"/><path d="${on ? "M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" : "M5.2 7V5a2.8 2.8 0 0 1 5.5-.6"}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
}

/** Attributs communs des en-têtes : rang, et comment déplacer la colonne (lu par les lecteurs d'écran). */
function attributsEnTete(sorte: string, rang: number): string {
  return `data-rang="${String(rang)}" aria-roledescription="en-tête déplaçable" aria-description="Glisser, ou flèches gauche et droite, pour déplacer la colonne ${esc(CH_LBL[sorte])}"`;
}

/** Largeur d'une case des rangées superposées, en pixels. */
const RANGEE_CASE = 150;

/**
 * Ruban du pivot des rangées superposées, en pixels : longueur, hauteur
 * minimale, largeur de l'élément au centre et des autres, écart entre deux
 * éléments, éléments dessinés de part et d'autre du centre.
 */
const RUBAN = { longueur: 860, hauteur: 112, centre: 224, element: 136, ecart: 10, deChaqueCote: 3 } as const;

/** Décalage horizontal du centre de l'élément à `d` crans du centre du ruban (négatif à gauche), en pixels. */
export function decalageRuban(d: number): number {
  if (d === 0) return 0;
  return Math.sign(d) * (RUBAN.centre / 2 + RUBAN.ecart + (Math.abs(d) - 1) * (RUBAN.element + RUBAN.ecart) + RUBAN.element / 2);
}

/**
 * Semestres compacts des rangées superposées, en pixels : largeur d'une
 * case, place de l'étiquette « Année n » en tête de chaque groupe, écart
 * entre deux semestres d'une année et entre deux années.
 */
const SEMESTRE_COMPACT = { case: 92, etiquette: 62, ecart: 6, ecartAnnees: 16 } as const;

/** Groupe de semestres d'une même année, dans la rangée des semestres : début, largeur, année et son code. */
interface GroupeAnnee {
  x: number;
  largeur: number;
  annee: number;
  code: string;
}

/**
 * Place côte à côte, groupés par année, les semestres `cases` (dans l'ordre
 * chronologique) à partir de l'abscisse `debut` : étiquette de l'année, puis
 * ses semestres serrés. Rend les groupes et la largeur totale.
 */
export function placerSemestresParAnnee(cases: readonly { x: number; annee: number }[], debut: number): { groupes: GroupeAnnee[]; largeur: number } {
  const groupes: GroupeAnnee[] = [];
  let x = debut;
  cases.forEach((n, rang) => {
    const groupe = groupes[groupes.length - 1];
    if (!groupe || groupe.annee !== n.annee) {
      if (rang > 0) x += SEMESTRE_COMPACT.ecartAnnees - SEMESTRE_COMPACT.ecart;
      groupes.push({ x, largeur: 0, annee: n.annee, code: anneeCode(n.annee) });
      x += SEMESTRE_COMPACT.etiquette;
    }
    n.x = x;
    x += SEMESTRE_COMPACT.case + SEMESTRE_COMPACT.ecart;
    const courant = groupes[groupes.length - 1] as GroupeAnnee;
    courant.largeur = x - SEMESTRE_COMPACT.ecart - courant.x;
  });
  return { groupes, largeur: cases.length ? x - SEMESTRE_COMPACT.ecart - debut : 0 };
}

/** Balisage d'un groupe d'année : cadre discret, « Année n » et son code, devant ses semestres. */
function groupeAnneeSvg(groupe: GroupeAnnee, y: number, hauteur: number): string {
  return `<g class="cannee"><rect x="${String(groupe.x - 5)}" y="${String(y - 5)}" width="${String(groupe.largeur + 10)}" height="${String(hauteur + 10)}" rx="10"/>
    <text class="cannee-t" x="${String(groupe.x + 6)}" y="${String(y + hauteur / 2 - 2)}">Année ${String(groupe.annee)}</text>
    <text class="cannee-c" x="${String(groupe.x + 6)}" y="${String(y + hauteur / 2 + 10)}">${esc(groupe.code)}</text></g>`;
}

/**
 * Balisage de la chaîne en rangées superposées : chaque colonne devient une
 * rangée, son en-tête au-dessus, les cases côte à côte ; la rangée
 * verrouillée porte un ruban horizontal. Les cases se placent comme en
 * colonnes, au barycentre de leurs liens avec la rangée la plus longue ; les
 * semestres, eux, forment un bloc serré, groupé par année, centré sur la
 * moyenne de leurs liens.
 */
function paintChainVerticale(M: ModeleChaine): string {
  const { kind, p, piv, sets } = M;
  const ordre = M.ordre;
  const NW = RANGEE_CASE,
    WL = RUBAN.longueur,
    PADX = 10,
    HG = 11,
    TETE = 34,
    RG = 40;
  const nid = (k: string, x: Objet): string => k + ":" + String(x.id);
  const semFix = semestreFixe(M);
  const pt = chainItemText(kind, piv);
  // ruban : assez haut pour l'intitulé complet de l'élément au centre (34 caractères par ligne environ)
  const fullH = (pt.code ? 16 : 0) + wrapN(pt.label, 34, 30).length * 15 + 16;
  const WH = Math.max(RUBAN.hauteur, fullH + 30);
  // Rangée des semestres (hors pivot) : cases compactes « Semestre n », l'année étant dite par leur groupe.
  const iSem = (ordre as string[]).indexOf("sem");
  const semCompacts = iSem !== p;
  const rows = ordre.map((k, i) =>
    i === p
      ? null
      : (sets[i] as Objet[]).map((x) => {
          const n = caseChaine(k, x, 0, semFix, COUPES_RANGEES);
          return k === "sem" ? chainNode({ ...n, sub: "" }) : n;
        }),
  );
  const anneeDe = new Map((sets[iSem] as Objet[]).map((x) => ["sem:" + String(x.id), Number(x.annee)]));
  const pivN = { id: nid(kind, piv), kind, h: WH, piv: true, x: 0, y: 0, t: [] } as CaseChaine;
  const rowN = (i: number): CaseChaine[] => (i === p ? [pivN] : (rows[i] as CaseChaine[]));
  const len = (n: CaseChaine): number => (n.piv ? WL : n.kind === "sem" && semCompacts ? SEMESTRE_COMPACT.case : NW);
  let groupes: GroupeAnnee[] = [];
  /** Place la rangée des semestres en un bloc groupé par année, centré sur le barycentre voulu (ou à `debut`). */
  const placerSemestres = (debut: number): number => {
    const cases = rowN(iSem).map((n) => Object.assign(n, { annee: anneeDe.get(n.id) ?? 0 }));
    const place = placerSemestresParAnnee(cases, debut);
    groupes = place.groupes;
    return place.largeur;
  };
  // épaisseur de chaque rangée : la plus haute de ses cases, toutes alignées sur elle
  const epais = ordre.map((_k, i) => (i === p ? WH : Math.max(34, ...rowN(i).map((n) => n.h))));
  ordre.forEach((_k, i) => {
    if (i !== p) rowN(i).forEach((n) => (n.h = epais[i] as number));
  });
  const Y = (i: number): number => epais.slice(0, i).reduce((a, h) => a + TETE + h + RG, 0);
  const anchor = (n: CaseChaine): number => n.x + len(n) / 2;
  const longueur = (i: number): number =>
    i === iSem && semCompacts ? placerSemestresParAnnee(rowN(i).map((n) => ({ x: 0, annee: anneeDe.get(n.id) ?? 0 })), 0).largeur : rowN(i).reduce((a, n) => a + len(n) + HG, 0);
  const base = ordre
    .map((_k, i) => i)
    .filter((i) => i !== p)
    .sort((a, b) => longueur(b) - longueur(a))[0] as number;
  let x = PADX;
  if (base === iSem && semCompacts) placerSemestres(PADX);
  else
    rowN(base).forEach((n) => {
      n.x = x;
      x += len(n) + HG;
    });
  const element = (i: number, n: CaseChaine): Objet | undefined => (n.piv ? piv : (sets[i] as Objet[]).find((e) => nid(ordre[i] as string, e) === n.id));
  const linked = (i: number, n: CaseChaine, j: number): CaseChaine[] => {
    const lo = Math.min(i, j);
    return rowN(j).filter((m) => {
      const A = element(lo, lo === i ? n : m),
        B = element(lo + 1, lo === i ? m : n);
      return A && B && M.rel(ordre[lo] as string, A, B);
    });
  };
  const placeRow = (i: number, ref: number): void => {
    if (i === iSem && semCompacts) {
      // Semestres : un bloc serré, centré sur la moyenne des places que voudraient leurs liens.
      const voulues = rowN(i).flatMap((n) => {
        const ls = linked(i, n, ref);
        return ls.length ? [ls.reduce((a, m) => a + anchor(m), 0) / ls.length] : [];
      });
      const largeur = placerSemestres(0);
      const centre = voulues.length ? voulues.reduce((a, v) => a + v, 0) / voulues.length : PADX + largeur / 2;
      placerSemestres(centre - largeur / 2);
      return;
    }
    let prev = -1e9;
    rowN(i).forEach((n) => {
      const ls = linked(i, n, ref);
      const want = ls.length ? ls.reduce((a, m) => a + anchor(m), 0) / ls.length : prev + len(n) / 2;
      let left = want - len(n) / 2;
      if (left < prev + HG) left = prev + HG;
      n.x = left;
      prev = left + len(n);
    });
  };
  for (let i = base + 1; i < ordre.length; i++) placeRow(i, i - 1);
  for (let i = base - 1; i >= 0; i--) placeRow(i, i + 1);
  const all = ordre.flatMap((_k, i) => rowN(i));
  const minX = Math.min(...all.map((n) => n.x), ...groupes.map((g) => g.x));
  all.forEach((n) => (n.x = Math.round(n.x + PADX - minX)));
  groupes.forEach((g) => (g.x = Math.round(g.x + PADX - minX)));
  ordre.forEach((_k, i) => {
    rowN(i).forEach((n) => (n.y = Y(i) + TETE));
  });
  const W = Math.max(PADX + 300, ...all.map((n) => n.x + len(n) + PADX));
  const last = ordre.length - 1;
  const H = Y(last) + TETE + (epais[last] as number) + 12;
  const links: { a: CaseChaine; b: CaseChaine; col: string | undefined }[] = [];
  for (let i = 0; i < last; i++)
    rowN(i).forEach((a) => {
      linked(i, a, i + 1).forEach((b) => links.push({ a, b, col: b.piv ? a.col || "#9aa2ae" : b.col }));
    });
  const path = (l: { a: CaseChaine; b: CaseChaine; col: string | undefined }): string => {
    const x1 = anchor(l.a),
      y1 = l.a.y + l.a.h,
      x2 = anchor(l.b),
      y2 = l.b.y,
      my = (y1 + y2) / 2;
    return `<path class="clink" data-link="${esc(l.a.id)}|${esc(l.b.id)}" d="M${x1.toFixed(1)} ${String(y1)}C${x1.toFixed(1)} ${String(my)} ${x2.toFixed(1)} ${String(my)} ${x2.toFixed(1)} ${String(y2)}" stroke="${esc(l.col || "#9aa2ae")}"/>`;
  };
  return `<div class="tw"><div class="chainbox vert" style="width:${String(W)}px;height:${String(H)}px">
    <svg class="chain" width="${String(W)}" height="${String(H)}" viewBox="0 0 ${String(W)} ${String(H)}">
      ${ordre.map((_k, i) => `<rect class="ccol${i % 2 ? " alt" : ""}${i === p ? " piv" : ""}" x="1" y="${String(Y(i) + TETE - 9)}" width="${String(W - 2)}" height="${String((epais[i] as number) + 18)}" rx="10"/>`).join("")}
      ${semCompacts ? groupes.map((g) => groupeAnneeSvg(g, Y(iSem) + TETE, epais[iSem] as number)).join("") : ""}
      <g class="links">${links.map(path).join("")}</g>
      ${ordre.flatMap((_k, i) => (i === p ? [] : (rows[i] as CaseChaine[]).map((n) => chainSvgNode(n, len(n))))).join("")}
    </svg>
    ${ordre
      .map(
        (k, i) => `<button type="button" class="chh${i === p ? " on" : ""}" data-lock="${k}" style="left:${String(PADX - 9)}px;top:${String(Y(i))}px;width:280px"
        aria-pressed="${String(i === p)}" ${attributsEnTete(k, i).replace("gauche et droite", "haut et bas")} title="${i === p ? "Rangée verrouillée" : "Verrouiller cette rangée"}">${cadenas(i === p)}<span>${esc(CH_LBL[k])}</span><b>${String(i === p ? M.items.length : (sets[i] as Objet[]).length)}</b></button>`,
      )
      .join("")}
    <div class="chpiv" style="left:${String(pivN.x)}px;top:${String(pivN.y)}px;width:${String(WL)}px">
      <div class="wheel tall ruban" id="chainWheel" tabindex="0" role="listbox" aria-label="${esc(CH_LBL[kind])}" style="height:${String(WH)}px"
        title="Molette ou flèches gauche et droite pour parcourir · clic ou Entrée pour sélectionner · tape du texte pour filtrer">
        <div class="wband"></div><div class="wstage"></div>
        <div class="wfade t"></div><div class="wfade b"></div>
        <button type="button" class="wpas g" data-pas="-1" tabindex="-1" aria-label="Élément précédent" title="Élément précédent">‹</button>
        <button type="button" class="wpas d" data-pas="1" tabindex="-1" aria-label="Élément suivant" title="Élément suivant">›</button>
        <div class="whint" hidden>molette, flèches ou clic pour en changer</div>
        <div class="wq" hidden></div>
      </div>
    </div>
    <div class="chlive" role="status" aria-live="polite"></div>
  </div></div>`;
}

/**
 * Verrouille la roue sur un élément et redessine. Un autre diplôme choisi
 * devient le diplôme actif (filtre remis à vide, données enregistrées).
 */
export function chainSetPivot(kind: string, id: unknown): void {
  const D = etat.donnees;
  carte().piv = { kind, id };
  carte().wq = "";
  if (kind === "dip" && id && id !== D.activeDiplome) {
    D.activeDiplome = id;
    carte().filter = { kind: "", value: "" };
    saveData();
    return;
  }
  peindreReferentiel();
}

/** Branche la roue du pivot, les cadenas des colonnes et le clic sur les cases de la chaîne dessinée dans `host`. */
export function chainBind(host: HTMLElement): void {
  const M = chainModel();
  if (!M) return;
  const el = host.querySelector<HTMLElement>("#chainWheel");
  const items: ElementRoue[] = M.items.map((x) =>
    Object.assign(
      { id: x.id, col: M.kind === "comp" ? "#10555F" : M.kind === "dip" ? "#7c8698" : (x.couleur as string) || "#9aa2ae", strong: M.kind === "dip" },
      chainItemText(M.kind, x),
    ),
  );
  const verticale = chaineVerticale(etat.preferences);
  if (el)
    pivotWheel(
      el,
      items,
      M.piv.id,
      (id) => {
        chainSetPivot(M.kind, id);
        const w = page().getElementById("chainWheel");
        if (w) w.focus({ preventScroll: true });
      },
      verticale ? "x" : "y",
    );
  host.querySelectorAll<HTMLElement>("[data-lock]").forEach((b) => {
    b.onclick = () => {
      if (enTeteGlisse) return;
      const k = b.dataset.lock as string;
      if (k === M.kind) return;
      const i = (M.ordre as string[]).indexOf(k),
        first = (M.sets[i] || [])[0];
      chainSetPivot(k, k === "dip" ? etat.donnees.activeDiplome : first ? first.id : "");
    };
    brancherEnTete(host, b, M.ordre, verticale);
  });
  if (verticale) montrerRuban(host);
  poserOutils(host, M.ordre, verticale);
  rendreFocusEtAnnonce(host);
  host.querySelectorAll<HTMLElement>("svg.chain .cnode").forEach((n) => {
    const go = (): void => {
      chainSetPivot(n.dataset.kind as string, n.dataset.sel);
    };
    n.onclick = go;
    n.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    };
  });
  chainWire(host);
}

/**
 * Rangées superposées : la chaîne peut être plus large que la zone, qui
 * défile alors de côté ; on la fait défiler pour que le ruban soit au
 * milieu de la vue, sinon il pourrait être hors de vue après un redessin.
 */
function montrerRuban(host: HTMLElement): void {
  const boite = host.querySelector<HTMLElement>(".chainbox.vert");
  const ruban = boite?.querySelector<HTMLElement>(".chpiv");
  const zone = boite?.parentElement;
  if (!boite || !ruban || !zone) return;
  zone.scrollLeft = Math.max(0, boite.offsetLeft + ruban.offsetLeft + ruban.offsetWidth / 2 - zone.clientWidth / 2);
}

/** Vrai juste après un glisser d'en-tête : le clic qui suit le relâchement ne verrouille pas la colonne. */
let enTeteGlisse = false;

/** Déplacement minimal (en pixels) avant qu'un appui sur un en-tête devienne un glisser, pour laisser passer les clics. */
const SEUIL_GLISSER = 5;

/** Libellés des colonnes dans l'ordre donné, pour les annonces. */
function libellesOrdre(ordre: readonly string[]): string {
  return ordre.map((k) => CH_LBL[k]).join(", ");
}

/**
 * Retient un nouvel ordre des colonnes (préférences enregistrées) et
 * redessine ; l'en-tête de `sorte` reprend le focus et `annonce` est lue.
 */
export function chainSetOrder(ordre: readonly SorteChaine[], sorte: SorteChaine | null, annonce: string): void {
  etat.preferences.chaineOrdre = [...ordre];
  savePrefs();
  carte().chFocus = sorte ? "lock:" + sorte : "";
  carte().chAnnonce = annonce;
  peindreReferentiel();
}

/** Passe des colonnes côte à côte aux rangées superposées, ou l'inverse ; choix enregistré. */
export function chainSetVertical(verticale: boolean): void {
  etat.preferences.chaineVerticale = verticale;
  savePrefs();
  carte().chFocus = "vue";
  carte().chAnnonce = verticale ? "Carte en rangées superposées." : "Carte en colonnes côte à côte.";
  peindreReferentiel();
}

/** Rétablit l'ordre par défaut des colonnes et la vue en colonnes côte à côte. */
export function chainResetOrder(): void {
  etat.preferences.chaineOrdre = [...SORTES_CHAINE];
  etat.preferences.chaineVerticale = false;
  savePrefs();
  carte().chFocus = "vue";
  carte().chAnnonce = "Ordre par défaut rétabli : " + libellesOrdre(SORTES_CHAINE) + ".";
  peindreReferentiel();
}

/**
 * Gestes d'un en-tête : flèches (gauche / haut pour reculer, droite / bas
 * pour avancer) et glisser à la souris, qui déplacent la colonne.
 */
function brancherEnTete(host: HTMLElement, b: HTMLElement, ordre: readonly SorteChaine[], verticale: boolean): void {
  const sorte = b.dataset.lock as SorteChaine;
  const rang = ordre.indexOf(sorte);
  const nom = CH_LBL[sorte] as string;
  const deplacer = (cible: number): void => {
    const nouvel = placerColonne(ordre, sorte, cible);
    const position = nouvel.indexOf(sorte);
    chainSetOrder(nouvel, sorte, `${verticale ? "Rangée" : "Colonne"} ${nom} déplacée en position ${String(position + 1)} sur ${String(nouvel.length)} : ${libellesOrdre(nouvel)}.`);
  };
  b.onkeydown = (e) => {
    const recule = e.key === "ArrowLeft" || e.key === "ArrowUp";
    const avance = e.key === "ArrowRight" || e.key === "ArrowDown";
    if (!recule && !avance) return;
    e.preventDefault();
    const cible = rang + (avance ? 1 : -1);
    if (cible < 0 || cible >= ordre.length) {
      annoncer(host, `${nom} est déjà en ${cible < 0 ? "première" : "dernière"} position.`);
      return;
    }
    deplacer(cible);
  };
  b.onpointerdown = (depart) => {
    if (depart.button !== 0) return;
    const boite = host.querySelector<HTMLElement>(".chainbox");
    if (!boite) return;
    const defile = boite.parentElement;
    // Positions mesurées dans la boîte de la chaîne : elles restent justes si la zone ou la page défile pendant le geste.
    const dansBoite = (e: { clientX: number; clientY: number }): number => {
      const r = boite.getBoundingClientRect();
      return verticale ? e.clientY - r.top : e.clientX - r.left;
    };
    const origine = dansBoite(depart);
    const autres = [...host.querySelectorAll<HTMLElement>("[data-lock]")].filter((autre) => autre !== b);
    const debut = (autre: HTMLElement): number => (verticale ? autre.offsetTop : autre.offsetLeft);
    const fin = (autre: HTMLElement): number => debut(autre) + (verticale ? autre.offsetHeight : autre.offsetWidth);
    let commence = false;
    let cible = rang;
    let repere: HTMLElement | null = null;
    const suivre = (e: PointerEvent): void => {
      if (!commence) {
        if (Math.abs(dansBoite(e) - origine) < SEUIL_GLISSER) return;
        commence = true;
        b.classList.add("chdrag");
        boite.classList.add("chdragging");
        repere = page().createElement("div");
        repere.className = "chdrop" + (verticale ? " v" : "");
        boite.append(repere);
      }
      e.preventDefault();
      // Près d'un bord, la zone de la chaîne (ou la page, en rangées) défile pour atteindre les colonnes cachées.
      if (verticale) {
        const vue = page().defaultView;
        if (vue && e.clientY < 40) vue.scrollBy(0, -16);
        else if (vue && e.clientY > vue.innerHeight - 40) vue.scrollBy(0, 16);
      } else if (defile) {
        const r = defile.getBoundingClientRect();
        if (e.clientX < r.left + 40) defile.scrollLeft -= 16;
        else if (e.clientX > r.right - 40) defile.scrollLeft += 16;
      }
      const position = dansBoite(e);
      b.style.transform = verticale ? `translateY(${String(position - origine)}px)` : `translateX(${String(position - origine)}px)`;
      cible = autres.filter((autre) => (debut(autre) + fin(autre)) / 2 < position).length;
      // Le repère se pose entre les deux en-têtes qui encadrent la place visée.
      const avant = autres[cible - 1];
      const apres = autres[cible];
      const bord = avant && apres ? (fin(avant) + debut(apres)) / 2 : apres ? debut(apres) - 4 : avant ? fin(avant) + 4 : 0;
      if (repere) {
        if (verticale) repere.style.top = String(Math.round(bord)) + "px";
        else repere.style.left = String(Math.round(bord)) + "px";
      }
    };
    const finir = (): void => {
      b.removeEventListener("pointermove", suivre);
      b.removeEventListener("pointerup", finir);
      b.removeEventListener("pointercancel", finir);
      if (!commence) return;
      enTeteGlisse = true;
      setTimeout(() => {
        enTeteGlisse = false;
      }, 0);
      b.classList.remove("chdrag");
      boite.classList.remove("chdragging");
      b.style.transform = "";
      repere?.remove();
      if (cible !== rang) deplacer(cible);
    };
    b.setPointerCapture(depart.pointerId);
    b.addEventListener("pointermove", suivre);
    b.addEventListener("pointerup", finir);
    b.addEventListener("pointercancel", finir);
  };
}

/**
 * Boutons « Vue verticale » et « Ordre par défaut », posés au bout de la
 * barre des vues (dessinée par l'habillage de la carte) pour ne rien décaler
 * au-dessus de la chaîne.
 */
function poserOutils(host: HTMLElement, ordre: readonly SorteChaine[], verticale: boolean): void {
  const barre = host.querySelector('[data-view="chain"]')?.parentElement;
  if (!barre) return;
  barre.querySelector(".chtools")?.remove();
  const doc = page();
  const outils = doc.createElement("span");
  outils.className = "chtools";
  const vue = doc.createElement("button");
  vue.type = "button";
  vue.dataset.chvue = "";
  vue.setAttribute("aria-pressed", String(verticale));
  vue.title = verticale ? "Revenir aux colonnes côte à côte" : "Montrer la chaîne en rangées superposées";
  vue.textContent = "Vue verticale";
  vue.onclick = () => {
    chainSetVertical(!verticale);
  };
  const defaut = doc.createElement("button");
  defaut.type = "button";
  defaut.dataset.chordre = "";
  defaut.textContent = "Ordre par défaut";
  defaut.title = "Semestre, compétence, EC, UE, diplôme, en colonnes côte à côte";
  defaut.disabled = estOrdreParDefaut(ordre) && !verticale;
  defaut.onclick = () => {
    chainResetOrder();
  };
  outils.append(vue, defaut);
  barre.append(outils);
}

/** Lit `texte` dans la zone d'annonce de la chaîne (après un court délai, pour que le lecteur d'écran la remarque). */
function annoncer(host: HTMLElement, texte: string): void {
  const zone = host.querySelector<HTMLElement>(".chlive");
  if (!zone) return;
  zone.textContent = "";
  setTimeout(() => {
    zone.textContent = texte;
  }, 60);
}

/** Après un redessin demandé par un geste sur l'ordre ou la vue : rend le focus à l'élément concerné et lit l'annonce. */
function rendreFocusEtAnnonce(host: HTMLElement): void {
  const focus = carte().chFocus as string | undefined;
  const annonce = carte().chAnnonce as string | undefined;
  carte().chFocus = "";
  carte().chAnnonce = "";
  if (focus) {
    const cible = focus === "vue" ? host.querySelector<HTMLElement>("[data-chvue]") : host.querySelector<HTMLElement>(`[data-lock="${focus.slice(5)}"]`);
    cible?.focus({ preventScroll: true });
  }
  if (annonce) annoncer(host, annonce);
}

/** Réglages de la roue : rayon, perspective, angle entre deux éléments, éléments de part et d'autre. */
const ROUE = { R: 110, PRS: 700, STEP: 14, SPAN: 6 } as const;

/**
 * Roue du pivot : montre l'élément courant entier, ou, en parcours, les
 * voisins en perspective. Molette (un pas toutes les 90 ms au plus), flèches,
 * Page précédente / suivante, saisie d'un filtre, Entrée ou clic pour choisir
 * (`onCommit` reçoit l'identifiant d'un autre élément), Échap pour revenir.
 * `axe` vaut « y » (roue verticale, colonnes côte à côte) ou « x » (ruban
 * horizontal, rangées superposées) : le ruban montre toujours ses voisins à
 * plat, côte à côte, l'élément courant au centre, et ses boutons ‹ › font
 * défiler comme les flèches ; les gestes sont les mêmes.
 */
export function pivotWheel(el: HTMLElement, all: ElementRoue[], curId: unknown, onCommit: (id: unknown) => void, axe: "x" | "y" = "y"): void {
  const stage = el.querySelector(".wstage") as HTMLElement,
    qbox = el.querySelector(".wq") as HTMLElement,
    band = el.querySelector(".wband") as HTMLElement;
  if (!all.length) return;
  let q = (carte().wq as string) || "",
    items = all,
    idx = 0,
    acc = 0,
    last = 0,
    browsing = false;
  const home = (): number => Math.max(0, items.findIndex((c) => c.id === curId));
  idx = home();
  const { SPAN, STEP, R, PRS } = ROUE,
    IH = 26;
  const etiquette = (c: ElementRoue): string => `${c.code ? `<span class="wc">${esc(c.code)}</span>` : ""}<span class="wt">${esc(c.label)}</span>`;
  const drawRuban = (full: boolean): void => {
    let h = "";
    for (let d = -RUBAN.deChaqueCote; d <= RUBAN.deChaqueCote; d++) {
      const i = idx + d;
      if (i < 0 || i >= items.length) continue;
      const c = items[i] as ElementRoue,
        largeur = d ? RUBAN.element : RUBAN.centre;
      h += `<button type="button" class="wit${d ? "" : " on"}${!d && full ? " full" : ""}${c.strong ? " b" : ""}" data-wi="${String(i)}" data-d="${String(d)}" tabindex="-1"
        style="--c:${esc(c.col || "#9aa2ae")};left:calc(50% + ${String(decalageRuban(d) - largeur / 2)}px);width:${String(largeur)}px"
        aria-selected="${String(!d)}">${etiquette(c)}</button>`;
    }
    stage.innerHTML = h;
  };
  const draw = (): void => {
    const full = !browsing && !q && items[idx] && (items[idx] as ElementRoue).id === curId;
    if (axe === "x") {
      drawRuban(!!full);
      qbox.hidden = !q && !browsing;
      qbox.textContent = q ? "filtre : " + q + " · Entrée pour choisir" : browsing ? "clic ou Entrée pour choisir" : "";
      const hint = el.querySelector<HTMLElement>(".whint");
      if (hint) hint.hidden = !full;
      return;
    }
    el.classList.toggle("solo", !!full);
    let h = "";
    for (let d = -SPAN; d <= SPAN; d++) {
      if (full && d) continue;
      const i = idx + d;
      if (i < 0 || i >= items.length) continue;
      const c = items[i] as ElementRoue,
        a = d * STEP,
        k = (PRS - R * Math.cos((a * Math.PI) / 180)) / PRS;
      h += `<button type="button" class="wit${d ? "" : " on"}${!d && full ? " full" : ""}${c.strong ? " b" : ""}" data-wi="${String(i)}" data-d="${String(d)}" tabindex="-1"
        style="--c:${esc(c.col || "#9aa2ae")};transform:rotateX(${(-a).toFixed(1)}deg) translateZ(${String(R)}px) scale(${k.toFixed(3)});opacity:${Math.max(0, 1 - Math.abs(d) / (SPAN + 1.1)).toFixed(2)}"
        aria-selected="${String(!d)}">${etiquette(c)}</button>`;
    }
    stage.innerHTML = h;
    band.style.height = "";
    band.style.marginTop = "";
    const on = stage.querySelector<HTMLElement>(".wit.on");
    if (full && on) {
      const hh = on.offsetHeight,
        ext = Math.max(0, hh - IH);
      on.style.marginTop = String(-hh / 2) + "px";
      band.style.height = String(hh + 4) + "px";
      band.style.marginTop = String(-(hh + 4) / 2) + "px";
      if (ext)
        stage.querySelectorAll<HTMLElement>(".wit:not(.on)").forEach((b) => {
          b.style.transform = `translateY(${((Math.sign(+(b.dataset.d as string)) * ext) / 2).toFixed(1)}px) ` + b.style.transform;
        });
    }
    qbox.hidden = !q && !browsing;
    qbox.textContent = q ? "filtre : " + q + " · Entrée pour choisir" : browsing ? "clic ou Entrée pour choisir" : "";
    const hint = el.querySelector<HTMLElement>(".whint");
    if (hint) hint.hidden = !full;
  };
  const select = (i: number): void => {
    const c = items[i];
    if (!c) return;
    browsing = false;
    if (c.id !== curId) {
      onCommit(c.id);
      return;
    }
    q = "";
    carte().wq = "";
    items = all;
    idx = home();
    draw();
  };
  const move = (n: number): void => {
    const j = Math.max(0, Math.min(items.length - 1, idx + n));
    if (j === idx) return;
    idx = j;
    browsing = true;
    draw();
  };
  const reset = (): void => {
    if (!browsing && !q) return;
    browsing = false;
    q = "";
    carte().wq = "";
    items = all;
    idx = home();
    draw();
  };
  const refilter = (): void => {
    carte().wq = q;
    browsing = !!q;
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- concaténation de l'historique gardée à l'identique (décision 37)
    items = q ? all.filter((c) => norm(c.code + " " + c.label).includes(norm(q))) : all;
    if (!items.length) {
      qbox.hidden = false;
      qbox.textContent = "filtre : " + q + " · rien";
      stage.innerHTML = "";
      band.style.height = "";
      return;
    }
    idx = q ? 0 : home();
    draw();
  };
  // molette : un cran = un élément, jamais plus d'un pas toutes les 90 ms
  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      // ruban : le défilement de côté d'un pavé tactile le fait défiler aussi
      const delta = axe === "x" && Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const dy = delta * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      acc = Math.max(-120, Math.min(120, acc + dy));
      const now = performance.now();
      if (Math.abs(acc) >= 40 && now - last > 90) {
        move(acc > 0 ? 1 : -1);
        acc = 0;
        last = now;
      }
    },
    { passive: false },
  );
  el.addEventListener("pointerenter", () => {
    if (page().activeElement !== el) el.focus({ preventScroll: true });
  });
  el.addEventListener("pointerleave", () => {
    acc = 0;
    reset();
  });
  el.addEventListener("blur", (e) => {
    // le focus passé à l'une de ses cases ne replie pas la roue
    if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
    acc = 0;
    reset();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
      return;
    }
    if (e.key === "PageDown") {
      e.preventDefault();
      move(5);
      return;
    }
    if (e.key === "PageUp") {
      e.preventDefault();
      move(-5);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      select(idx);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      reset();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (q) {
        q = q.slice(0, -1);
        refilter();
      }
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      q += e.key;
      refilter();
    }
  });
  // Un appui sur une case ne lui donne pas le focus : sinon la roue perdait le sien, se repliait (et la page
  // pouvait défiler pour montrer la case) avant le clic, qui tombait à côté. Défaut corrigé, voir CHANGELOG.
  stage.addEventListener("mousedown", (e) => {
    if ((e.target as Element).closest("[data-wi]")) e.preventDefault();
  });
  stage.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-wi]");
    if (!b) return;
    select(+(b.dataset.wi as string));
  });
  // boutons ‹ › du ruban : un cran, sans prendre le focus à la roue (même raison que pour les cases)
  el.querySelectorAll<HTMLElement>("[data-pas]").forEach((b) => {
    b.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
    b.addEventListener("click", () => {
      move(Number(b.dataset.pas));
    });
  });
  if (q) refilter();
  else draw();
}

/**
 * Survol de la chaîne dessinée dans `host` : une case éclaire tout ce qui
 * lui est relié, de proche en proche dans les deux sens ; un semestre fait
 * afficher aux EC le code qu'ils portent cette année-là.
 */
export function chainWire(host: HTMLElement): void {
  const svg = host.querySelector("svg.chain");
  if (!svg) return;
  // survol d'un semestre : les EC affichent le code qu'ils portent cette année-là
  const ecN = [...svg.querySelectorAll<SVGGElement>('.cnode[data-kind="ec"]')];
  const setCodes = (sem: string | undefined): void => {
    ecN.forEach((g) => {
      const t = g.querySelector(".ccode");
      if (!t) return;
      const e = (etat.donnees.ecs as Objet[]).find((x) => x.id === g.dataset.sel);
      t.textContent = sem && e ? ecCodeAt(e, sem) || "—" : g.dataset.code0 || "";
      g.classList.toggle("ctmp", !!sem && !!e);
    });
  };
  svg.querySelectorAll<SVGGElement>('.cnode[data-kind="sem"]').forEach((n) => {
    n.addEventListener("pointerenter", () => {
      setCodes(n.dataset.sel);
    });
    n.addEventListener("focus", () => {
      setCodes(n.dataset.sel);
    });
    n.addEventListener("pointerleave", () => {
      setCodes("");
    });
    n.addEventListener("blur", () => {
      setCodes("");
    });
  });
  const links = [...svg.querySelectorAll<SVGPathElement>(".clink")].map((el) => {
    const [a, b] = (el.dataset.link as string).split("|") as [string, string];
    return { el, a, b };
  });
  type Lien = (typeof links)[number];
  const up: Record<string, Lien[]> = {},
    down: Record<string, Lien[]> = {};
  links.forEach((l) => {
    (up[l.b] = up[l.b] || []).push(l);
    (down[l.a] = down[l.a] || []).push(l);
  });
  const reach = (id: string, map: Record<string, Lien[]>, acc: { nodes: Set<string>; links: Set<Element> }): void => {
    (map[id] || []).forEach((l) => {
      const nxt = map === up ? l.a : l.b;
      acc.links.add(l.el);
      if (!acc.nodes.has(nxt)) {
        acc.nodes.add(nxt);
        reach(nxt, map, acc);
      }
    });
  };
  svg.querySelectorAll<SVGGElement>(".cnode").forEach((n) => {
    const id = n.dataset.node as string;
    n.addEventListener("pointerenter", () => {
      const acc = { nodes: new Set([id]), links: new Set<Element>() };
      reach(id, up, acc);
      reach(id, down, acc);
      svg.classList.add("dim");
      svg.querySelectorAll<SVGGElement>(".cnode").forEach((x) => x.classList.toggle("hot", acc.nodes.has(x.dataset.node as string)));
      links.forEach((l) => l.el.classList.toggle("hot", acc.links.has(l.el)));
    });
    n.addEventListener("pointerleave", () => {
      svg.classList.remove("dim");
      svg.querySelectorAll(".hot").forEach((x) => {
        x.classList.remove("hot");
      });
    });
  });
}

/** Donne au dessin de la chaîne le document où il dessine. */
export function brancherChaineDessin(document: Document | null): void {
  documentCourant = document;
}
