// SPDX-License-Identifier: CECILL-2.1
/**
 * Dessin de la carte radiale du référentiel : couronnes des UE, des EC et
 * des années, points des compétences, cœur du diplôme ; encadré de droite
 * qui détaille la portion survolée ou figée.
 *
 * Repris du fichier historique (décision 38) à l'identique : mêmes calculs,
 * même ordre d'appels. Le balisage reste écrit en chaînes, caractère pour
 * caractère comme avant (attributs, ordre, espaces, retours à la ligne,
 * arrondis `toFixed`), pour que le dessin se vérifie au pixel près contre
 * l'ancien ; chaque valeur variable y passe par `esc`, comme avant. Les
 * données affichées sont préparées par `interface/carte-donnees`.
 */
import { SEMESTRES } from "../domaine/constituer";
import { arcPath, fitN, polar, wrapN } from "../domaine/carte-geometrie";
import { esc, lienEc } from "./aides-communes";
import { compsOfEc, ecName, filtComps, filtEcs, radialGroups } from "./carte-donnees";
import { tidy } from "./constantes";
import { anneeCode, ecCodeLbl, ecCodeShort } from "./donnees";
import { etat, type Objet } from "./etat";

/** Années d'un diplôme, dans l'ordre de la couronne. */
export const ANNEES = [1, 2, 3];

/** Année (1 à 3) d'un semestre ; un semestre inconnu compte pour la première. */
export const anneeOf = (sem: unknown): number => Math.floor(Math.max(0, (SEMESTRES as readonly unknown[]).indexOf(sem)) / 2) + 1;

/**
 * Mesures de la carte, en unités du dessin. Z0 : zoom de départ (quart
 * bas-droit de la roue) ; ZMAX : grossissement le plus fort permis ; RARR :
 * rayon des flèches de rotation ; DIST : écart d'éclatement de chaque couronne.
 */
export const RAD = { RARR: 505, Z0: 1.65, ZMAX: 2.5, S: 760, c: 380, PAD: 100, HUB: 84, RB: 360, RL: 380, DIST: [9, 17, 25, 33] };

/** Angle de la roue, en degrés : lu au dessin, modifié par la rotation (`interface/radiale-gestes`). */
export const roue = { angle: 0 };

let documentCourant: Document | null = null;

function page(): Document {
  if (documentCourant === null) throw new Error("carte radiale : document absent");
  return documentCourant;
}

/** Libellé centré en (`x`, `y`), une ligne par élément de `lines` ; texte vide sans ligne. */
export function tlabel(x: number, y: number, lines: readonly unknown[], cls: string, size: number, lh: number): string {
  if (!lines.length) return "";
  return (
    `<text class="lbl ${cls}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" font-size="${String(size)}" text-anchor="middle">` +
    lines.map((t, i) => `<tspan x="${x.toFixed(1)}" y="${(y + (i - (lines.length - 1) / 2) * lh).toFixed(1)}">${esc(t)}</tspan>`).join("") +
    `</text>`
  );
}

/** Repère d'angle d'un secteur : couronne, bornes et milieu (radians). */
interface Secteur {
  ring: number;
  a0: number;
  a1: number;
  am: number;
}

/** Balisage SVG de la carte radiale pour le référentiel actif, le filtre et la répartition retenus. */
export function paintRadial(): string {
  const m = (etat.referentiel.meta || {}) as Objet;
  const groups = radialGroups();
  const S = 760,
    c = S / 2,
    HUB = 84;
  const R = { ue: [90, 186] as const, ec: [192, 274] as const, an: [280, 324] as const, dot: 338 };
  const w = (g: { ecs: Objet[] }): number => Math.max(1, g.ecs.length);
  const tot = groups.reduce((a, g) => a + w(g), 0) || 1;
  const GAP = 0.014;
  let a = -Math.PI / 2;
  const out: string[] = [],
    dots: string[] = [];
  const sg = (kind: string, sel: unknown, inner: string, p: Secteur | null, id: unknown, sem?: string): string =>
    `<g class="sg" data-sel="${esc(sel)}" data-kind="${kind}" data-id="${esc(id || "")}"${sem ? ` data-sem="${esc(sem)}"` : ""} tabindex="0"` +
    (p ? ` data-ring="${String(p.ring)}" data-a0="${p.a0.toFixed(4)}" data-a1="${p.a1.toFixed(4)}" data-am="${p.am.toFixed(4)}"` : "") +
    `>${inner}</g>`;
  groups.forEach((g) => {
    const span = (w(g) / tot) * Math.PI * 2,
      a0 = a + GAP / 2,
      a1 = a + span - GAP / 2;
    const uc = (g.u.couleur as string) || "#9aa2ae";
    const uam = (a0 + a1) / 2,
      ur = (R.ue[0] + R.ue[1]) / 2;
    const [ux, uy] = polar(c, ur, uam);
    out.push(
      sg(
        "ue",
        g.u.nom,
        `<path class="seg" d="${arcPath(c, c, R.ue[0], R.ue[1], a0, a1)}" fill="${esc(uc)}" fill-opacity=".8"/>` +
          tlabel(ux, uy, fitN((g.u.nom as string).replace(/^UE\s*/i, ""), 10, 11, Math.min((a1 - a0) * ur, R.ue[1] - R.ue[0]) - 10), "lue", 10, 11),
        { ring: 0, a0, a1, am: uam },
        g.u.id,
      ),
    );
    let e0 = a0;
    const step = (a1 - a0) / Math.max(1, g.ecs.length);
    g.ecs.forEach((ec) => {
      const c0 = e0 + GAP / 3,
        c1 = e0 + step - GAP / 3,
        cm = (c0 + c1) / 2;
      const col = (ec.couleur as string) || uc;
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
      const nom = String(ec.nom || "").trim();
      const rNom = (R.ec[0] + R.ec[1]) / 2;
      const larg = (c1 - c0) * rNom;
      const lignes = nom ? fitN(nom, 9, 9.5, larg - 3, 4) : [];
      const [ex, ey] = polar(c, rNom, cm);
      out.push(
        sg(
          "ec",
          ec.id,
          `<path class="seg" d="${arcPath(c, c, R.ec[0], R.ec[1], c0, c1)}" fill="${esc(col)}" fill-opacity=".45"/>` + (lignes.length ? tlabel(ex, ey, lignes, "lecn", 9, 9.5) : ""),
          { ring: 1, a0: c0, a1: c1, am: cm },
          ec.id,
        ),
      );
      // couronne des années : une part par année de diplôme, semestres réunis
      const sems0 = SEMESTRES.filter((x) => ((ec.sems || []) as unknown[]).includes(x));
      const sl0 = sems0.length || 1,
        sstep0 = (c1 - c0) / sl0;
      const ans = ANNEES.map((an) => ({ an, idx: sems0.map((sm, i) => (anneeOf(sm) === an ? i : -1)).filter((i) => i >= 0) })).filter((x) => x.idx.length);
      (ans.length ? ans : [{ an: 0, idx: [0] }]).forEach(({ an, idx }) => {
        const sep = ans.length > 1;
        const b0 = c0 + Math.min(...idx) * sstep0 + (sep ? GAP / 5 : 0),
          b1 = c0 + (Math.max(...idx) + 1) * sstep0 - (sep ? GAP / 5 : 0),
          bm = (b0 + b1) / 2;
        const rb = (R.an[0] + R.an[1]) / 2,
          larg = (b1 - b0) * rb - 4;
        const lbl = an ? "Année " + String(an) : "—",
          court = an ? "A" + String(an) : "—";
        const [mx2, my2] = polar(c, rb, bm);
        out.push(
          sg(
            "an",
            String(ec.id) + "|" + String(an),
            `<path class="seg" d="${arcPath(c, c, R.an[0], R.an[1], b0, b1)}" fill="${esc(col)}" fill-opacity=".26"/>` +
              tlabel(mx2, my2, [lbl.length * 4.6 <= larg ? lbl : court], "lan", 10.5, 10),
            { ring: 2, a0: b0, a1: b1, am: bm },
            ec.id,
            String(an),
          ),
        );
      });
      // points extérieurs : une compétence portée par cet EC, tous semestres confondus
      const comps = filtComps(compsOfEc(ec.id));
      comps.forEach((cp, i) => {
        const ang = c0 + ((i + 0.5) / comps.length) * (c1 - c0);
        const rr = R.dot + (i % 3) * 10;
        const [dx, dy] = polar(c, rr, ang);
        // Retours à la ligne et retraits dans la balise gardés tels quels (rendu à l'identique).
        dots.push(`<circle class="dot" cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="5.2"
          fill="${esc(col)}" data-sel="${esc(cp.code)}" data-kind="comp" data-id="${esc(cp.id)}" tabindex="0"
          data-ring="3" data-am="${ang.toFixed(4)}"><title>${esc(String(cp.code) + " · " + ((cp.libelle || "") as string))}</title></circle>`);
      });
      e0 += step;
    });
    a += span;
  });
  const dipL = wrapN(m.diplomeNom || m.diplome || "Aucun diplôme", 14, 3);
  const men = m.mention ? "mention " + (m.mention as string) : "";
  const n = dipL.length + (men ? 1 : 0);
  let hy = c - ((n - 1) * 16) / 2;
  let hub = "";
  dipL.forEach((t) => {
    hub += `<text class="lhub" x="${String(c)}" y="${hy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${esc(t)}</text>`;
    hy += 16;
  });
  if (men) hub += `<text class="lmen" x="${String(c)}" y="${hy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${esc(men)}</text>`;
  const P = RAD.PAD;
  return `<svg viewBox="${String(-P)} ${String(-P)} ${String(S + 2 * P)} ${String(S + 2 * P)}" class="radial" role="img" aria-label="Carte du référentiel">
    <g id="wheelRot" transform="rotate(${roue.angle.toFixed(2)} ${String(c)} ${String(c)})">${out.join("")}${dots.join("")}<g id="radSpread"></g></g>
    <circle class="hub" cx="${String(c)}" cy="${String(c)}" r="${String(HUB)}"/>
    ${hub}
    <path class="zone" d="${arcPath(c, c, HUB + 2, 332, -Math.PI / 4, Math.PI / 4)}"/>
  </svg>`;
}

/**
 * Remplit l'encadré de droite (`#radInfo`) : UE, EC, année d'un EC ou
 * compétence désignée par `kind` et `sel`, ou l'invitation de départ sans
 * `kind`. `frozen` ajoute la mention « Figé » ; `tint` colore le rail d'une
 * compétence. Sans encadré dans la page, ne fait rien.
 */
export function radInfo(kind: string | null | undefined, sel?: unknown, frozen?: boolean, tint?: string | null): void {
  const D = etat.donnees,
    box = page().getElementById("radInfo");
  if (!box) return;
  if (!kind) {
    box.innerHTML = `<div class="k">Carte du référentiel</div>
      <div class="hint">Survolez pour éclater une portion, cliquez pour la figer.</div>`;
    return;
  }
  const competences = D.competences as Objet[],
    ues = D.ues as Objet[],
    ecs0 = D.ecs as Objet[];
  const compsOfEcIds = (ids: unknown[]): Objet[] => filtComps(competences.filter((c) => (c.ecIds as unknown[]).some((x) => ids.includes(x))));
  const plural = (n: number, a: string, b: string): string => String(n) + " " + (n > 1 ? b : a);
  const codesDe = (e: Objet): Record<number, unknown> => (e.codes || {}) as Record<number, unknown>;
  // cr, k, ttl et sub reçoivent leur valeur dans chacune des quatre branches.
  let col = "var(--line-strong)",
    cr: string,
    k: string,
    ttl: unknown,
    tx = "",
    sub: string,
    pills = "";
  if (kind === "ue") {
    const u = ues.find((x) => x.nom === sel) || {};
    const ecs = filtEcs(ecs0.filter((e) => e.ueId === u.id));
    const ids = ecs.map((e) => e.id);
    col = (u.couleur as string) || col;
    cr = tidy(u.code || "");
    k = "Unité d'enseignement";
    ttl = (sel as string).replace(/^UE\s*/i, "");
    sub = [plural(ecs.length, "enseignement", "enseignements"), plural(compsOfEcIds(ids).length, "compétence", "compétences")].join(" · ");
  } else if (kind === "ec") {
    const e = ecs0.find((y) => y.id === sel) || {};
    const u = ues.find((y) => y.id === e.ueId) || {};
    col = (e.couleur as string) || col;
    cr = [tidy(u.code || ""), ((u.nom || "") as string).replace(/^UE\s*/i, "")].filter(Boolean).join(" · ");
    k = "Enseignement constitutif";
    ttl = ecName(e);
    tx = ANNEES.map((a) => (codesDe(e)[a] ? anneeCode(a) + " : " + String(codesDe(e)[a]) : ""))
      .filter(Boolean)
      .join("  ·  ");
    sub = [((e.sems || []) as unknown[]).join(" "), plural(compsOfEcIds([e.id]).length, "compétence", "compétences")].filter(Boolean).join(" · ");
  } else if (kind === "an") {
    const [eid, a0] = String(sel).split("|");
    const a = +(a0 as string);
    const e = ecs0.find((y) => y.id === eid) || {};
    const u = ues.find((y) => y.id === e.ueId) || {};
    const sms = ((e.sems || []) as unknown[]).filter((sm) => anneeOf(sm) === a);
    const n = filtComps(
      competences.filter((c) => {
        const l = lienEc(c, eid);
        return !!l && ((l.sems || []) as unknown[]).some((sm) => anneeOf(sm) === a);
      }),
    ).length;
    col = (e.couleur as string) || col;
    cr = [tidy(u.code || ""), ((u.nom || "") as string).replace(/^UE\s*/i, "")].filter(Boolean).join(" · ");
    k = "Année " + String(a) + " · " + anneeCode(a) + (sms.length ? " · " + sms.join(" ") : "");
    ttl = ([codesDe(e)[a] || "code à renseigner", ecName(e)] as string[]).filter(Boolean).join(" · ");
    tx = ANNEES.filter((y) => y !== a && codesDe(e)[y])
      .map((y) => anneeCode(y) + " : " + String(codesDe(e)[y]))
      .join("  ·  ");
    sub = plural(n, "compétence évaluée", "compétences évaluées");
  } else {
    const cp = competences.find((y) => y.code === sel) || {};
    const b = (D.blocs as Objet[]).find((y) => y.num === String(cp.bloc)) || {};
    cr = b.nom ? "Bloc " + (cp.bloc as string) + " · " + (b.nom as string) : cp.bloc ? "Bloc " + (cp.bloc as string) : "";
    k = "Compétence";
    ttl = sel;
    tx = (cp.libelle as string) || "";
    col = tint || col;
    const ecsC = ecs0.filter((e) => ((cp.ecIds || []) as unknown[]).includes(e.id));
    sub = plural(ecsC.length, "EC rattaché", "EC rattachés");
    pills =
      `<div class="l">` +
      ecsC.map((e) => `<span class="pill c" style="--c:${esc(e.couleur || "#9aa2ae")}" title="${esc(ecCodeLbl(e) + " · " + ecName(e))}">${esc(ecCodeShort(e))}</span>`).join("") +
      `</div>`;
  }
  // Retours à la ligne et retraits gardés tels quels (rendu à l'identique).
  box.innerHTML = `<div class="rail" style="--c:${esc(col)}"></div>
    ${cr ? `<div class="cr">${esc(cr)}</div>` : ""}
    <div class="k">${esc(k)}</div>
    <b class="ttl">${esc(ttl)}</b>
    ${tx ? `<p class="tx">${esc(tx)}</p>` : ""}
    ${sub ? `<div class="s">${esc(sub)}</div>` : ""}
    ${pills}
    ${frozen ? `<div class="fz">Figé · survole la roue pour relâcher</div>` : ""}`;
}

/** Donne au dessin de la carte radiale le document où il dessine. */
export function brancherRadialeDessin(document: Document | null): void {
  documentCourant = document;
}
