// SPDX-License-Identifier: CECILL-2.1
/**
 * Dessin et gestes de la carte heuristique (chaîne) : cinq colonnes, l'une
 * verrouillée en roue sur un pivot, les autres reliées à lui ; cases, liens,
 * en-têtes à cadenas, roue du pivot (molette, flèches, saisie d'un filtre),
 * survol qui éclaire ce qui est relié et codes des EC au survol d'un semestre.
 *
 * Repris du fichier historique (décision 38) à l'identique : mêmes calculs,
 * même ordre d'appels, mêmes écouteurs. Le balisage reste écrit en chaînes,
 * caractère pour caractère comme avant (attributs, ordre, espaces, arrondis
 * `toFixed`), pour que le dessin se vérifie au pixel près contre l'ancien ;
 * chaque valeur variable y passe par `esc`, comme avant. Le modèle (pivot,
 * colonnes, relations) est dans `interface/chaine-modele`.
 */
import { wrapN } from "../domaine/carte-geometrie";
import { esc } from "./aides-communes";
import { ecName, refFilter } from "./carte-donnees";
import { CH_KINDS, CH_LBL, chainItemText, chainModel, chainNode } from "./chaine-modele";
import { norm } from "./constantes";
import { anneeCode, ecCodeAt, ecCodeShort } from "./donnees";
import { etat, type Objet } from "./etat";

/** Ce que le module appelle encore par la fenêtre. */
interface FonctionsHistoriques {
  paintRef(): void;
  saveData(redessiner?: boolean, depuisDictionnaire?: boolean): void;
}

type Fenetre = Record<string, unknown>;

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

let fenetre: Fenetre = {};
let documentCourant: Document | null = null;

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

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
  const { kind, p, piv, sets } = M;
  const CW = 172,
    CWP = 238,
    GAP = 30,
    PADX = 10,
    TOP = 44,
    VG = 11;
  const widths = CH_KINDS.map((_k, i) => (i === p ? CWP : CW));
  const X = (i: number): number => PADX + widths.slice(0, i).reduce((a, w) => a + w + GAP, 0);
  const LAST = CH_KINDS.length - 1,
    W = X(LAST) + (widths[LAST] as number) + PADX;
  const nid = (k: string, x: Objet): string => k + ":" + String(x.id);
  // un seul semestre en vue (colonne verrouillée dessus, ou filtrée à un seul) : les EC portent son code
  const iSem = (CH_KINDS as readonly string[]).indexOf("sem");
  const semFix = kind === "sem" ? (piv.sem as string) : (sets[iSem] || []).length === 1 ? ((sets[iSem] as Objet[])[0] as Objet).sem as string : "";
  const node = (k: string, x: Objet, i: number): CaseChaine => {
    const col = k === "comp" ? "#10555F" : k === "dip" ? "#7c8698" : (x.couleur as string) || "#9aa2ae";
    let o = { id: nid(k, x), kind: k, sel: x.id, col, x: X(i) } as Omit<CaseChaine, "y" | "h">;
    if (k === "comp") o = Object.assign(o, { code: x.code, t: wrapN(x.libelle || x.code, 31, 3) });
    else if (k === "sem") o = Object.assign(o, { t: ["Semestre " + String(x.num)], sub: "Année " + String(x.annee) + " · " + anneeCode(x.annee as number), strong: true });
    else if (k === "ec") o = Object.assign(o, { code: semFix ? ecCodeAt(x, semFix) || "—" : ecCodeShort(x), t: wrapN(ecName(x), 25, 3) });
    else if (k === "ue") o = Object.assign(o, { t: wrapN(x.nom, 25, 3), sub: (x.code as string) || "" });
    else o = Object.assign(o, { t: wrapN(chainItemText("dip", x).label, 30, 2), strong: true });
    return chainNode(o) as CaseChaine;
  };
  // pivot : roue seule, assez haute pour l'intitulé complet de l'élément sélectionné
  const pt = chainItemText(kind, piv);
  const cpl = pt.code ? 24 : 31,
    fullH = wrapN(pt.label, cpl, 30).length * 17 + 12;
  const WH = Math.max(CH_WH, fullH + 150);
  const cols = CH_KINDS.map((k, i) => (i === p ? null : (sets[i] as Objet[]).map((x) => node(k, x, i))));
  const pivN = { id: nid(kind, piv), kind, h: WH, piv: true, x: X(p) } as CaseChaine;
  const colN = (i: number): CaseChaine[] => (i === p ? [pivN] : (cols[i] as CaseChaine[]));
  const anchor = (n: CaseChaine): number => (n.piv ? n.y + WH / 2 : n.y + n.h / 2);
  // colonne de base : la plus haute hors pivot
  const tall = (i: number): number => colN(i).reduce((a, n) => a + n.h + VG, 0);
  const base = CH_KINDS.map((_k, i) => i)
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
      k = CH_KINDS[lo] as string;
    return colN(j).filter((m) => {
      const a = lo === i ? n : m,
        b = lo === i ? m : n;
      const A = a.piv ? piv : (sets[lo] as Objet[]).find((x) => nid(CH_KINDS[lo] as string, x) === a.id),
        B = b.piv ? piv : (sets[lo + 1] as Objet[]).find((x) => nid(CH_KINDS[lo + 1] as string, x) === b.id);
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
  for (let i = base + 1; i < CH_KINDS.length; i++) placeCol(i, i - 1);
  for (let i = base - 1; i >= 0; i--) placeCol(i, i + 1);
  const all = CH_KINDS.flatMap((_k, i) => colN(i));
  const minY = Math.min(...all.map((n) => n.y));
  all.forEach((n) => (n.y += TOP - minY));
  all.forEach((n) => {
    n.cy = anchor(n);
  });
  const H = Math.max(...all.map((n) => n.y + n.h)) + 22;
  // liens
  const links: { a: CaseChaine; b: CaseChaine; col: string | undefined }[] = [];
  for (let i = 0; i < CH_KINDS.length - 1; i++)
    colN(i).forEach((a) => {
      linked(i, a, i + 1).forEach((b) => links.push({ a, b, col: b.piv ? a.col || "#9aa2ae" : b.col }));
    });
  const path = (l: { a: CaseChaine; b: CaseChaine; col: string | undefined }): string => {
    const x1 = l.a.x + (widths[(CH_KINDS as readonly string[]).indexOf(l.a.kind)] as number),
      y1 = l.a.cy as number,
      x2 = l.b.x,
      y2 = l.b.cy as number,
      mx = (x1 + x2) / 2;
    return `<path class="clink" data-link="${esc(l.a.id)}|${esc(l.b.id)}" d="M${String(x1)} ${y1.toFixed(1)}C${String(mx)} ${y1.toFixed(1)} ${String(mx)} ${y2.toFixed(1)} ${String(x2)} ${y2.toFixed(1)}" stroke="${esc(l.col || "#9aa2ae")}"/>`;
  };
  const lock = (on: boolean): string =>
    `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.6" fill="currentColor"/><path d="${on ? "M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" : "M5.2 7V5a2.8 2.8 0 0 1 5.5-.6"}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
  return `<div class="tw"><div class="chainbox" style="width:${String(W)}px;height:${H.toFixed(0)}px">
    <svg class="chain" width="${String(W)}" height="${H.toFixed(0)}" viewBox="0 0 ${String(W)} ${H.toFixed(0)}">
      ${CH_KINDS.map((_k, i) => `<rect class="ccol${i % 2 ? " alt" : ""}${i === p ? " piv" : ""}" x="${String(X(i) - 9)}" y="34" width="${String((widths[i] as number) + 18)}" height="${(H - 40).toFixed(0)}" rx="10"/>`).join("")}
      <g class="links">${links.map(path).join("")}</g>
      ${CH_KINDS.flatMap((_k, i) => (i === p ? [] : (cols[i] as CaseChaine[]).map((n) => chainSvgNode(n, widths[i] as number)))).join("")}
    </svg>
    ${CH_KINDS.map(
      (k, i) => `<button type="button" class="chh${i === p ? " on" : ""}" data-lock="${k}" style="left:${String(X(i) - 9)}px;width:${String((widths[i] as number) + 18)}px"
        aria-pressed="${String(i === p)}" title="${i === p ? "Colonne verrouillée" : "Verrouiller cette colonne"}">${lock(i === p)}<span>${esc(CH_LBL[k])}</span><b>${String(i === p ? M.items.length : (sets[i] as Objet[]).length)}</b></button>`,
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
    historique().saveData();
    return;
  }
  historique().paintRef();
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
  if (el)
    pivotWheel(el, items, M.piv.id, (id) => {
      chainSetPivot(M.kind, id);
      const w = page().getElementById("chainWheel");
      if (w) w.focus({ preventScroll: true });
    });
  host.querySelectorAll<HTMLElement>("[data-lock]").forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.lock as string;
        if (k === M.kind) return;
        const i = (CH_KINDS as readonly string[]).indexOf(k),
          first = (M.sets[i] || [])[0];
        chainSetPivot(k, k === "dip" ? etat.donnees.activeDiplome : first ? first.id : "");
      }),
  );
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
 * Roue du pivot : montre l'élément courant entier, ou, en parcours, les
 * voisins en perspective. Molette (un pas toutes les 90 ms au plus), flèches,
 * Page précédente / suivante, saisie d'un filtre, Entrée ou clic pour choisir
 * (`onCommit` reçoit l'identifiant d'un autre élément), Échap pour revenir.
 */
export function pivotWheel(el: HTMLElement, all: ElementRoue[], curId: unknown, onCommit: (id: unknown) => void): void {
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
  const SPAN = 6,
    STEP = 14,
    R = 110,
    PRS = 700,
    IH = 26;
  const draw = (): void => {
    const full = !browsing && !q && items[idx] && (items[idx] as ElementRoue).id === curId;
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
        aria-selected="${String(!d)}">${c.code ? `<span class="wc">${esc(c.code)}</span>` : ""}<span class="wt">${esc(c.label)}</span></button>`;
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
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
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
  el.addEventListener("blur", () => {
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
  stage.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-wi]");
    if (!b) return;
    select(+(b.dataset.wi as string));
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

/** Pose ces fonctions sur `cible` (la fenêtre) sous leurs noms historiques. */
export function publierChaineDessin(cible: Fenetre, document: Document | null): void {
  fenetre = cible;
  documentCourant = document;
  Object.assign(cible, { chainSvgNode, paintChain, chainSetPivot, chainBind, pivotWheel, chainWire });
}
