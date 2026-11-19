// SPDX-License-Identifier: CECILL-2.1
/**
 * Gestes de la carte radiale : éclatement d'une portion au survol ou au
 * focus, pastilles des compétences, gel au clic, rotation par les flèches,
 * zoom (boutons, molette, clavier, pincement), mise à l'échelle quand la
 * colonne ou la fenêtre change de taille.
 *
 * Repris du fichier historique (décision 38) à l'identique : mêmes calculs,
 * dans le même ordre (arrondis `toFixed` compris), mêmes écouteurs posés
 * dans le même ordre, mêmes animations par `requestAnimationFrame`, mêmes
 * attributs écrits sur les éléments. Les calculs du zoom sont dans
 * `domaine/zoom-carte` (lus par `window.dnmaxPont.zoomCarte`, comme avant),
 * le dessin dans `interface/radiale-dessin`.
 */
import type { VueCarte } from "../domaine/zoom-carte";
import { ecNum, lienEc } from "./aides-communes";
import { filtComps } from "./carte-donnees";
import { etat, type Objet } from "./etat";
import { RAD, anneeOf, radInfo, roue } from "./radiale-dessin";

type Fenetre = Record<string, unknown>;

/** Pastille d'une compétence, posée autour de la roue (angle `a`, rayon `r`, largeur `w`). */
interface Pastille {
  g: SVGElement;
  a: number;
  r: number;
  w: number;
  c: Objet;
}

/** Étiquette placée hors de la roue ; aucune n'est créée aujourd'hui, le placement reste prévu. */
interface Etiquette {
  g: SVGElement;
  a: number;
  w: number;
  h: number;
}

interface Boite {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Flèche de rotation : arc posé au dessin (`_g`), phase de la pointe animée (`_ph`). */
type Fleche = SVGGElement & { _g?: { a0: number; a1: number; dir: number; u: number }; _ph?: number };

let documentCourant: Document | null = null;

/** Animation de la rotation en cours, annulée quand la carte est redessinée. */
let wheelRaf = 0;
/** Nouvelle mise à l'échelle de la carte affichée quand la colonne ou la fenêtre change de taille. */
let radRedim: (() => void) | null = null;
let radObs: ResizeObserver | null = null;

function page(): Document {
  if (documentCourant === null) throw new Error("carte radiale : document absent");
  return documentCourant;
}

function ui(): Objet {
  return etat.ui;
}

/** `cible.closest(selecteur)` quand la cible en a un (un élément), sinon rien. */
function proche(cible: EventTarget | null, selecteur: string): SVGElement | null {
  const element = cible as { closest?: (s: string) => Element | null } | null;
  return element && element.closest ? (element.closest(selecteur) as SVGElement | null) : null;
}

/** Remplissage d'un élément, ou de son premier rectangle ou cercle ; texte vide sinon. */
function remplissage(g: Element): string | null {
  return (g.querySelector("rect,circle") || ({ getAttribute: (): string => "" } as Pick<Element, "getAttribute">)).getAttribute("fill");
}

/**
 * Branche les gestes sur la carte radiale dessinée dans `host` (par
 * `paintRadial`, dans le cadre de l'habillage). Sans carte, ne fait rien.
 */
export function radialWire(host: HTMLElement): void {
  const svg = host.querySelector<SVGSVGElement>("svg.radial");
  if (!svg) return;
  const D = etat.donnees,
    C = RAD.c,
    P = RAD.PAD,
    VB = RAD.S + 2 * P;
  const competences = (): Objet[] => D.competences as Objet[];
  const rot = svg.querySelector("#wheelRot") as SVGGElement,
    layer = svg.querySelector("#radSpread") as SVGGElement;
  if (wheelRaf) cancelAnimationFrame(wheelRaf);
  const reduce = (window.matchMedia as typeof window.matchMedia | undefined) && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lbls = [...svg.querySelectorAll<SVGElement>(".lbl")].map((el) => ({ el, x: +(el.dataset.x as string), y: +(el.dataset.y as string) }));
  const parts = [...svg.querySelectorAll<SVGElement>("[data-am]")];
  const segs = parts.filter((x) => x.classList.contains("sg"));
  let cur: SVGElement | null = null,
    frozen: { pin: SVGElement | null } | null = null,
    badges: Pastille[] = [],
    callouts: Etiquette[] = [],
    v = 0,
    last = 0,
    relT = 0,
    lastTarget: EventTarget | null = null,
    calR = RAD.RL;
  let vue: VueCarte | null = null; // vue affichée (zoom et centre, en unités du dessin), voir domaine/zoom-carte
  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag: string, attrs: Record<string, unknown>, txt?: unknown): SVGElement => {
    const el = page().createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, String(attrs[k]));
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de textContent gardée à l'identique (décision 37)
    if (txt != null) el.textContent = String(txt);
    return el;
  };
  // ---- placement des étiquettes dynamiques (toujours à l'endroit, hors de la roue)
  const place = (): void => {
    const W = (roue.angle * Math.PI) / 180,
      ra = (-roue.angle).toFixed(2);
    badges.forEach((b) => {
      const x = C + b.r * Math.cos(b.a),
        y = C + b.r * Math.sin(b.a);
      b.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ra})`);
    });
    // les pastilles de compétences comptent comme obstacles pour les étiquettes d'EC
    const boxes: Boite[] = badges.map((b) => {
      const t = b.a + W,
        sx = b.r * Math.cos(t),
        sy = b.r * Math.sin(t);
      return { x0: sx - b.w / 2 - 2, x1: sx + b.w / 2 + 2, y0: sy - 12, y1: sy + 12 };
    });
    callouts.forEach((co) => {
      const th = co.a + W,
        ct = Math.cos(th),
        st = Math.sin(th);
      let d = calR + (co.w / 2) * Math.abs(ct) + (co.h / 2) * Math.abs(st),
        bx!: Boite;
      for (let k = 0; k < 8; k++) {
        const sx = d * ct,
          sy = d * st;
        bx = { x0: sx - co.w / 2 - 3, x1: sx + co.w / 2 + 3, y0: sy - co.h / 2 - 3, y1: sy + co.h / 2 + 3 };
        if (!boxes.some((o) => bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0)) break;
        d += co.h * 0.6 + 4;
      }
      boxes.push(bx);
      const x = C + d * Math.cos(co.a),
        y = C + d * Math.sin(co.a);
      co.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ra})`);
    });
  };
  const orient = (): void => {
    const a = (-roue.angle).toFixed(2);
    lbls.forEach((o) => {
      o.el.setAttribute("transform", `rotate(${a} ${String(o.x)} ${String(o.y)})`);
    });
    place();
  };
  orient();
  // ---- éclatement
  const push = (el: SVGElement, dist: number): void => {
    const a = +(el.dataset.am as string);
    el.style.setProperty("--px", (Math.cos(a) * dist).toFixed(1) + "px");
    el.style.setProperty("--py", (Math.sin(a) * dist).toFixed(1) + "px");
  };
  const clear = (): void => {
    svg.classList.remove("open", "openc");
    parts.forEach((x) => {
      x.classList.remove("push", "hot", "trail", "fam", "lit");
      x.style.removeProperty("--px");
      x.style.removeProperty("--py");
    });
    layer.innerHTML = "";
    badges = [];
    callouts = [];
    cur = null;
    calR = RAD.RL;
  };
  const keysOf = (c: Objet | null | undefined): unknown[] => {
    const o: unknown[] = [];
    (((c || {}).ecs || []) as Objet[]).forEach((l) => {
      o.push(l.id);
      ((l.sems || []) as unknown[]).forEach((sm) => {
        const k2 = String(l.id) + "|" + String(anneeOf(sm));
        if (!o.includes(k2)) o.push(k2);
      });
    });
    return o;
  };
  const lit = (keys: unknown[]): void => {
    segs.forEach((x) => {
      const k = x.dataset.kind;
      const key = k === "an" ? String(x.dataset.id) + "|" + (x.dataset.sem || "") : x.dataset.id;
      x.classList.toggle("lit", (k === "ec" || k === "an") && x.classList.contains("fam") && keys.includes(key));
    });
  };
  const info = (): void => {
    const tintOf = (g: SVGElement | null): string => (g ? g.getAttribute("fill") || remplissage(g) || "" : "");
    if (frozen && frozen.pin) {
      radInfo("comp", frozen.pin.dataset.sel, true, tintOf(frozen.pin));
      return;
    }
    if (cur) radInfo(cur.dataset.kind, cur.dataset.sel, !!frozen, tintOf(cur));
    else radInfo(null);
  };
  const angOff = (a: number, ref: number): number => {
    let d = a - ref;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  };
  const explodeSeg = (el: SVGElement): void => {
    clear();
    cur = el;
    const r = +(el.dataset.ring as string),
      am = +(el.dataset.am as string),
      a0 = +(el.dataset.a0 as string),
      a1 = +(el.dataset.a1 as string);
    svg.classList.add("open");
    el.classList.add("hot", "fam");
    push(el, RAD.DIST[r] as number);
    segs.forEach((x) => {
      if (x === el) return;
      const xr = +(x.dataset.ring as string),
        xa = +(x.dataset.am as string);
      if (xr > r) {
        if (xa < a0 || xa > a1) return;
        x.classList.add("push", "fam");
        push(x, RAD.DIST[xr] as number);
      } else if (xr < r) {
        if (am < +(x.dataset.a0 as string) || am > +(x.dataset.a1 as string)) return;
        x.classList.add("trail", "fam");
      }
    });
    // EC de la portion : leur code reste dans la couronne, l'encadré de droite les détaille
    // (l'historique relevait aussi les secteurs d'EC de la portion, sans s'en servir : relevé retiré, sans effet)
    const anEls = segs.filter((x) => x.dataset.kind === "an" && (x === el || x.classList.contains("push")));
    const held = (c: Objet): SVGElement[] =>
      anEls.filter((x) => {
        const l = lienEc(c, x.dataset.id),
          a = +(x.dataset.sem || 0);
        return !!l && (a ? ((l.sems || []) as unknown[]).some((sm) => anneeOf(sm) === a) : true);
      });
    // compétences de la portion, au semestre près : étalées autour de la roue
    const comps = filtComps(competences().filter((c) => held(c).length));
    const where = (c: Objet): number => {
      const own = held(c);
      return own.length ? own.reduce((s2, x) => s2 + angOff(+(x.dataset.am as string), am), 0) / own.length : 0;
    };
    const list = comps
      .map((c) => ({ c, o: where(c) }))
      .sort((p, q) => p.o - q.o || +(p.c.bloc as string) - +(q.c.bloc as string) || ecNum(p.c.code) - ecNum(q.c.code));
    const n = list.length;
    if (n) {
      // pastilles avec code, sur trois rangées au plus. Elles restent dans le secteur de la portion ;
      // si elles n'y tiennent pas, elles débordent sur le secteur de l'élément de dessous (l'UE),
      // et seulement au-delà si celui-ci ne suffit pas non plus.
      // présentation homogène : toujours en colonnes de trois rangées (moins s'il y a moins de trois
      // compétences), pastilles de même largeur. Le bloc reste dans le secteur de la portion, déborde
      // si besoin sur celui de l'élément de dessous, puis les pastilles rapetissent plutôt que de
      // s'étaler plus loin ; le chevauchement n'intervient qu'en dernier recours.
      const th = am + (roue.angle * Math.PI) / 180,
        sn = Math.abs(Math.sin(th)),
        cs = Math.abs(Math.cos(th));
      const rows = Math.min(3, n),
        cols = Math.ceil(n / rows);
      const maxLen = Math.max(...list.map(({ c }) => String(c.code).length));
      const zf = 1 / (1 + 0.45 * ((vue ? vue.zoom : RAD.Z0) - 1));
      let sc = zf;
      const dims = (): { BW: number; BH: number; PITCH: number; ROWH: number } => {
        const BW = (maxLen * 6.6 + 12) * sc,
          BH = 19 * sc;
        return { BW, BH, PITCH: BW * sn + BH * cs + 4 * sc, ROWH: BW * cs + BH * sn + 3 * sc };
      };
      const EDGE = 324 + (RAD.DIST[2] as number) + 16; // au-delà de l'anneau des années éclaté et agrandi
      let d = dims(),
        R0 = EDGE + d.ROWH / 2;
      let lo = a0,
        hi = a1;
      const avail = (): number => Math.max(hi - lo - 0.012, 0.02);
      const need = (): number => (cols * d.PITCH) / R0;
      if (need() > avail()) {
        const par = segs.filter((x) => x.classList.contains("trail")).sort((p2, q) => +(q.dataset.ring as string) - +(p2.dataset.ring as string));
        for (const x of par) {
          lo = Math.min(lo, +(x.dataset.a0 as string));
          hi = Math.max(hi, +(x.dataset.a1 as string));
          if (need() <= avail()) break;
        }
      }
      if (need() > avail()) {
        sc = Math.max(0.62 * zf, (sc * avail()) / need());
        d = dims();
        R0 = EDGE + d.ROWH / 2;
      }
      const colStep = d.PITCH / R0,
        bloc = Math.min(cols * colStep, 2 * Math.PI * 0.92);
      let from = am - bloc / 2;
      if (bloc <= avail()) from = Math.min(Math.max(from, lo + 0.006), hi - 0.006 - bloc);
      calR = R0 + (rows - 1) * d.ROWH + d.ROWH / 2 + 6;
      const colOf = (c: Objet): unknown => {
        const own = held(c)[0];
        const e = own ? (D.ecs as Objet[]).find((y) => y.id === own.dataset.id) : null;
        return (e || {}).couleur || "#9aa2ae";
      };
      list.forEach(({ c }, i) => {
        const g = mk("g", { class: "cb fam", "data-sel": c.code, "data-id": c.id, "data-kind": "comp", tabindex: "0" });
        g.appendChild(mk("rect", { x: (-d.BW / 2).toFixed(1), y: (-d.BH / 2).toFixed(1), width: d.BW.toFixed(1), height: d.BH.toFixed(1), rx: (d.BH / 2).toFixed(1), fill: colOf(c) }));
        g.appendChild(mk("text", { "text-anchor": "middle", "dominant-baseline": "central", x: 0, y: 0.5, "font-size": (10.5 * sc).toFixed(1) }, c.code));
        g.appendChild(mk("title", {}, String(c.code) + " · " + ((c.libelle || "") as string)));
        layer.appendChild(g);
        const col = Math.floor(i / rows),
          row = i % rows;
        badges.push({ g, a: from + colStep * (col + 0.5), r: R0 + row * d.ROWH, w: d.BW, c });
      });
    }
    callouts.sort((p, q) => angOff(p.a, am) - angOff(q.a, am));
    place();
  };
  const explodeComp = (el: SVGElement): void => {
    clear();
    cur = el;
    svg.classList.add("openc");
    el.classList.add("hot", "fam");
    const cp = competences().find((c) => c.id === el.dataset.id) || {};
    const keys = keysOf(cp),
      ids = (cp.ecIds || []) as unknown[];
    const uids = (D.ecs as Objet[]).filter((e) => ids.includes(e.id)).map((e) => e.ueId);
    segs.forEach((x) => {
      const k = x.dataset.kind,
        id = x.dataset.id;
      const key = k === "an" ? String(id) + "|" + (x.dataset.sem || "") : id;
      if ((k === "an" && keys.includes(key)) || (k === "ec" && ids.includes(id)) || (k === "ue" && uids.includes(id))) x.classList.add("trail", "fam");
    });
  };
  const explode = (el: SVGElement): void => {
    if (el.classList.contains("dot")) explodeComp(el);
    else explodeSeg(el);
  };
  // ---- gel au clic, relâché en survolant la zone de rotation
  const freeze = (pin: SVGElement | null): void => {
    frozen = { pin: pin || null };
    v = 0;
    clearTimeout(relT);
    relT = 0;
    svg.classList.add("frozen");
    badges.forEach((b) => b.g.classList.toggle("pin", b.g === pin));
    lit(pin ? keysOf(competences().find((c) => c.id === pin.dataset.id)) : []);
    info();
  };
  const release = (): void => {
    frozen = null;
    clearTimeout(relT);
    relT = 0;
    svg.classList.remove("frozen");
    clear();
    radInfo(null);
    const t = proche(lastTarget, ".sg,.dot");
    if (t && svg.contains(t)) {
      explode(t);
      info();
    }
  };
  segs.concat(parts.filter((x) => x.classList.contains("dot"))).forEach((el) => {
    const go = (): void => {
      if (frozen) return;
      explode(el);
      info();
    };
    el.addEventListener("pointerenter", go);
    el.addEventListener("focus", go);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (cur !== el) explode(el);
      freeze(null);
    });
  });
  layer.addEventListener("pointerover", (e) => {
    const b = proche(e.target, ".cb");
    if (!b) return;
    if (!(frozen && frozen.pin)) lit(keysOf(competences().find((c) => c.id === b.dataset.id)));
    radInfo("comp", b.dataset.sel, !!frozen, remplissage(b));
  });
  layer.addEventListener("pointerout", (e) => {
    const b = proche(e.target, ".cb");
    if (!b || b.contains(e.relatedTarget as Node | null)) return;
    const epingle = frozen && frozen.pin;
    if (epingle) lit(keysOf(competences().find((c) => c.id === epingle.dataset.id)));
    else lit([]);
    info();
  });
  layer.addEventListener("click", (e) => {
    const b = proche(e.target, ".cb");
    if (!b) return;
    e.stopPropagation();
    freeze(frozen && frozen.pin === b ? null : b);
  });
  svg.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && frozen) release();
  });
  // ---- rotation
  const tick = (ts: number): void => {
    if (!last) last = ts;
    const dt = Math.min(0.06, (ts - last) / 1000);
    last = ts;
    if (v && !frozen) {
      roue.angle = (roue.angle + v * dt) % 360;
      rot.setAttribute("transform", `rotate(${roue.angle.toFixed(2)} ${String(C)} ${String(C)})`);
      orient();
    }
    wheelRaf = requestAnimationFrame(tick);
  };
  svg.addEventListener("pointermove", (e) => {
    lastTarget = e.target;
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const x = vb.x + (e.clientX - r.left) * (vb.width / r.width) - C,
      y = vb.y + (e.clientY - r.top) * (vb.height / r.height) - C;
    const dd = Math.hypot(x, y);
    // zone de rotation recalculée sur la partie visible (zoom) : quart droit de la vue = zone calme,
    // la vitesse dépend de la hauteur par rapport au milieu de la vue
    // la roue ne tourne qu'au survol des deux pastilles de rotation (toujours visibles, à gauche de la vue)
    const pad = proche(e.target, ".rpad");
    if (frozen) {
      v = 0;
      if (pad) {
        clearTimeout(relT);
        relT = 0;
        release();
        v = +(pad.dataset.dir as string) * 60;
      }
      return;
    }
    // portion éclatée : la roue s'arrête, ce qu'on vise reste sous le doigt.
    // Elle ne repart qu'une fois sorti pour de bon — au centre ou au-delà des compétences.
    if (svg.classList.contains("open") || svg.classList.contains("openc")) {
      if (dd > calR + 18 || dd < RAD.HUB + 4) {
        clear();
        radInfo(null);
      } else {
        v = 0;
        return;
      }
    }
    v = pad && !reduce ? +(pad.dataset.dir as string) * 60 : 0;
  });
  svg.addEventListener("pointerleave", () => {
    v = 0;
    clearTimeout(relT);
    relT = 0;
    if (!frozen) {
      clear();
      radInfo(null);
    }
  });
  // zoom : au départ, le quart bas-droit de la roue remplit la vue (centre de la roue en haut à gauche) ;
  // en dézoomant, la roue rétrécit et se recentre jusqu'à la vue entière. Le cadre garde la même taille
  // à tous les zooms (seul le viewBox change) : rien ne saute ni ne déborde sur les blocs voisins.
  // Les calculs (bornes, centrage sur le pointeur, animation) sont dans src/domaine/zoom-carte.ts.
  const ZC = (window.dnmaxPont as NonNullable<Window["dnmaxPont"]>).zoomCarte;
  const ZM = RAD.HUB + 14; // au zoom de départ, le cercle du diplôme reste entier et les compétences éclatées restent visibles
  const GEO = { cote: VB, origine: -P, centreRoue: C, rayonCoeur: ZM, zoomMin: 1, zoomMax: RAD.ZMAX, zoomDepart: RAD.Z0 };
  // tailles de police (unités du dessin) des libellés qui disparaissent quand ils deviennent illisibles
  const LIBELLES = { lue: 10, lecn: 9, lan: 10.5 };
  const cadre = host.querySelector<HTMLElement>(".radcadre"),
    barre = host.querySelector<HTMLElement>(".radzoom");
  const sortie = barre && barre.querySelector("output");
  let rapport = 1,
    hautCadre = 0,
    cible: VueCarte | null = null,
    animRaf = 0,
    animT = 0;
  const NS2 = "http://www.w3.org/2000/svg";
  const zn0 = svg.querySelector(".zone");
  if (zn0) zn0.remove();
  // flèches de rotation : deux arcs fléchés qui tournent autour de la roue, au-delà de la zone
  // d'éclatement, l'un en haut à droite de la vue (sens inverse), l'autre en bas à gauche (sens horaire)
  const pads = [-1, 1].map((dir) => {
    const g = page().createElementNS(NS2, "g") as Fleche;
    g.setAttribute("class", "rpad");
    g.dataset.dir = String(dir);
    g.innerHTML = `<path class="hit"/><path class="arc"/><path class="ah"/><title>${dir < 0 ? "Tourner la roue dans le sens inverse" : "Tourner la roue dans le sens des aiguilles d'une montre"} (survoler)</title>`;
    svg.appendChild(g);
    return g;
  });
  // taille du cadre : largeur de la colonne, hauteur tenant dans la fenêtre (sous la barre de zoom)
  const dimensionner = (): void => {
    const w = cadre ? cadre.clientWidth : svg.getBoundingClientRect().width;
    const reste = window.innerHeight - (barre ? barre.getBoundingClientRect().height + 6 : 0);
    const h = ZC.hauteurCadre(w, reste, window.innerWidth >= 2200 ? 1120 : 940);
    if (cadre && h) cadre.style.height = String(h) + "px";
    hautCadre = h || svg.getBoundingClientRect().height;
    rapport = hautCadre ? w / hautCadre : 1;
  };
  const zoomDepart = (): number => (cadre && cadre.clientWidth < 480 ? 1 : RAD.Z0);
  const dessiner = (vz: VueCarte): void => {
    vue = vz;
    const { largeur: vw, hauteur: vh } = ZC.tailleVue(vz.zoom, VB, rapport);
    const ox = vz.centreX - vw / 2,
      oy = vz.centreY - vh / 2;
    svg.setAttribute("viewBox", `${ox.toFixed(2)} ${oy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const u = vh / (hautCadre || 600);
    // libellés trop petits à l'écran : masqués plutôt que superposés en bouillie
    const vis = ZC.libellesVisibles(1 / u, LIBELLES);
    for (const k in vis) svg.classList.toggle("sans-" + k, !vis[k]);
    if (sortie) sortie.textContent = String(Math.round(vz.zoom * 100)) + " %";
    if (barre) {
      (barre.querySelector('[data-rz="-1"]') as HTMLButtonElement).disabled = vz.zoom <= GEO.zoomMin + 1e-3;
      (barre.querySelector('[data-rz="1"]') as HTMLButtonElement).disabled = vz.zoom >= GEO.zoomMax - 1e-3;
    }
    // flèches : deux arcs sur un même cercle virtuel autour de la roue (au-delà de la zone d'éclatement),
    // placés là où ce cercle est visible : en haut à droite (un peu plus haut) et en bas à gauche
    const R = RAD.RARR,
      M = 26 * u,
      span = 0.24;
    const vis2 = (ang: number): boolean => {
      const x = C + R * Math.cos(ang),
        y = C + R * Math.sin(ang);
      return x >= ox + M && x <= ox + vw - M && y >= oy + M && y <= oy + vh - M;
    };
    const fits = (c: number): boolean => {
      for (let k = -6; k <= 6; k++) if (!vis2(c + (span * k) / 6)) return false;
      return true;
    };
    const near = (tgt: number): number => {
      for (let d = 0; d <= Math.PI; d += 0.01) {
        if (fits(tgt + d)) return tgt + d;
        if (fits(tgt - d)) return tgt - d;
      }
      return tgt;
    };
    // flèche du haut : la position la plus haute possible côté droit ; flèche du bas : la plus à gauche côté bas
    const best = (from: number, to: number, score: (a: number) => number, fb: number): number => {
      let b: number | null = null,
        bs = Infinity;
      for (let a = from; a <= to; a += 0.01)
        if (fits(a)) {
          const sc = score(a);
          if (sc < bs) {
            bs = sc;
            b = a;
          }
        }
      return b == null ? near(fb) : b;
    };
    const targets = [
      best(-Math.PI * 0.5, Math.PI * 0.3, (a) => Math.sin(a) + 0.15 * Math.abs(a + Math.PI * 0.43), -Math.PI * 0.43),
      best(Math.PI * 0.3, Math.PI * 1.25, (a) => Math.cos(a) + 0.15 * Math.abs(a - Math.PI * 0.83), Math.PI * 0.83),
    ];
    pads.forEach((pg, i) => {
      const am = targets[i] as number,
        dir = +(pg.dataset.dir as string),
        a0 = am - span,
        a1 = am + span,
        pt = (a: number): [number, number] => [C + R * Math.cos(a), C + R * Math.sin(a)];
      const [x0, y0] = pt(a0),
        [x1, y1] = pt(a1);
      const arc = `M${x0.toFixed(1)} ${y0.toFixed(1)}A${String(R)} ${String(R)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      (pg.querySelector(".arc") as SVGPathElement).setAttribute("d", arc);
      (pg.querySelector(".hit") as SVGPathElement).setAttribute("d", arc);
      (pg.querySelector(".ah") as SVGPathElement).setAttribute("d", `M${String(-14)} ${String(-8)}L2 0L${String(-14)} 8`);
      pg._g = { a0, a1, dir, u };
      pg.style.setProperty("--u", u.toFixed(3));
      placeHead(pg);
    });
  };
  // animation douce vers la vue visée ; saut immédiat si les mouvements sont réduits
  const animer = (ts: number): void => {
    animRaf = 0;
    if (!svg.isConnected || !cible) return;
    const dt = animT ? Math.min(64, ts - animT) : 16;
    animT = ts;
    // seul le zoom s'anime : la vue suit le trajet de départ, la roue ne glisse que sur la diagonale
    const pas = ZC.pasAnimation(vue || cible, cible, dt, reduce ? 0 : 60);
    const suivante = pas === cible ? cible : ZC.vueDepart(rapport, GEO, pas.zoom);
    dessiner(suivante);
    if (suivante !== cible) animRaf = requestAnimationFrame(animer);
    else animT = 0;
  };
  // seule une vue choisie par l'enseignant est retenue d'un affichage à l'autre ; sinon, la vue de
  // départ est recalculée à chaque changement de taille du cadre
  const viser = (vz: VueCarte, instant?: boolean, retenir = true): void => {
    cible = ZC.bornerVue(vz, rapport, GEO);
    if (retenir) ui().radVue = cible;
    if (instant || reduce || !vue) {
      if (animRaf) {
        cancelAnimationFrame(animRaf);
        animRaf = 0;
        animT = 0;
      }
      dessiner(cible);
      return;
    }
    if (!animRaf) animRaf = requestAnimationFrame(animer);
  };
  const zoomer = (facteur: number): void => {
    const base = cible || vue;
    if (!base) return;
    viser(ZC.zoomerSurDiagonale(base, facteur, rapport, GEO));
  };
  const vueInitiale = (): VueCarte => (ui().radVue as VueCarte | null | undefined) || ZC.vueDepart(rapport, GEO, zoomDepart());
  const ajuster = (): void => {
    ui().radVue = null;
    viser(ZC.vueDepart(rapport, GEO, zoomDepart()), false, false);
  };
  const PAS = 1.15; // un clic sur + ou − : petit pas, sans à-coup
  // la pointe remonte le long du trait, dans le sens de rotation (plus vite au survol)
  // au toucher, pas de survol : la roue tourne tant qu'on appuie sur une flèche
  pads.forEach((pg) => {
    pg.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      e.preventDefault();
      try {
        pg.setPointerCapture(e.pointerId);
      } catch {
        // capture refusée (pointeur déjà relâché) : la rotation part quand même, comme avant
      }
      if (frozen) release();
      v = +(pg.dataset.dir as string) * 60;
      pg.classList.add("on");
    });
    const stop = (): void => {
      if (pg.classList.contains("on")) {
        v = 0;
        pg.classList.remove("on");
      }
    };
    pg.addEventListener("pointerup", stop);
    pg.addEventListener("pointercancel", stop);
  });
  const placeHead = (pg: Fleche): void => {
    const g = pg._g;
    if (!g) return;
    const ph = pg._ph || 0;
    const a = g.dir > 0 ? g.a0 + (g.a1 - g.a0) * ph : g.a1 - (g.a1 - g.a0) * ph;
    const x = C + RAD.RARR * Math.cos(a),
      y = C + RAD.RARR * Math.sin(a),
      deg = (a * 180) / Math.PI + 90 * g.dir;
    const pointe = pg.querySelector(".ah") as SVGPathElement;
    pointe.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)}) scale(${g.u.toFixed(3)})`);
    (pg.querySelector(".ah") as SVGPathElement).style.opacity = Math.min(1, ph * 6, (1 - ph) * 6).toFixed(2);
  };
  const padRaf = (): void => {
    pads.forEach((pg) => {
      const hov = pg.matches(":hover");
      pg._ph = ((pg._ph || 0) + (hov ? 0.028 : 0.009)) % 1;
      placeHead(pg);
    });
    if (svg.isConnected) requestAnimationFrame(padRaf);
  };
  if (!((window.matchMedia as typeof window.matchMedia | undefined) && matchMedia("(prefers-reduced-motion: reduce)").matches)) requestAnimationFrame(padRaf);
  else
    pads.forEach((pg) => {
      pg._ph = 0.999;
    });
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomer(ZC.facteurMolette(e.deltaY, e.deltaMode, e.ctrlKey));
    },
    { passive: false },
  );
  // pincement à deux doigts (écran tactile) : le zoom suit l'écart des doigts
  const doigts = new Map<number, { x: number; y: number }>();
  let pince: { d: number; vue: VueCarte } | null = null;
  const ecart = (): { d: number; x: number; y: number } => {
    const [a, b] = [...doigts.values()] as [{ x: number; y: number }, { x: number; y: number }];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  svg.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (doigts.size === 2) {
      const g = ecart();
      // comme avant, la vue de référence peut manquer (aucune vue encore posée)
      pince = { d: g.d || 1, vue: (cible || vue) as VueCarte };
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!doigts.has(e.pointerId)) return;
    doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pince && doigts.size === 2) {
      const g = ecart();
      viser(ZC.zoomerSurDiagonale(pince.vue, g.d / pince.d, rapport, GEO), true);
    }
  });
  const lever = (e: PointerEvent): void => {
    doigts.delete(e.pointerId);
    if (doigts.size < 2) pince = null;
  };
  (["pointerup", "pointercancel", "pointerleave"] as const).forEach((t) => {
    svg.addEventListener(t, lever);
  });
  if (barre)
    barre.querySelectorAll<HTMLElement>("[data-rz]").forEach(
      (b) =>
        (b.onclick = () => {
          const k = +(b.dataset.rz as string);
          if (k) zoomer(k > 0 ? PAS : 1 / PAS);
          else ajuster();
        }),
    );
  svg.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomer(PAS);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomer(1 / PAS);
    } else if (e.key === "0") {
      e.preventDefault();
      ajuster();
    }
  });
  // mise en place, puis suivi de la taille de la colonne (fenêtre redimensionnée, panneau latéral, écran changé)
  dimensionner();
  viser(vueInitiale(), true, false);
  radRedim = () => {
    if (!svg.isConnected) return;
    const avant = rapport,
      h0 = hautCadre;
    dimensionner();
    if (rapport === avant && hautCadre === h0 && vue) return;
    viser(vueInitiale(), true, false);
  };
  if (radObs) radObs.disconnect();
  radObs =
    (window.ResizeObserver as typeof ResizeObserver | undefined) && cadre
      ? new ResizeObserver(() => {
          if (radRedim) radRedim();
        })
      : null;
  if (radObs) radObs.observe(cadre as HTMLElement);
  radInfo(null);
  wheelRaf = requestAnimationFrame(tick);
}

/**
 * Écoute le redimensionnement de la fenêtre pour remettre la carte affichée
 * à l'échelle. À appeler une fois, là où le fichier historique posait cet
 * écouteur (à sa lecture, juste avant le démarrage).
 */
export function ecouterRedimensionnement(fenetre: Pick<Window, "addEventListener">): void {
  fenetre.addEventListener("resize", () => {
    if (radRedim) radRedim();
  });
}

/** Pose `radialWire` sur `cible` (la fenêtre) sous son nom historique. */
export function publierRadialeGestes(cible: Fenetre, document: Document | null): void {
  documentCourant = document;
  Object.assign(cible, { radialWire });
}
