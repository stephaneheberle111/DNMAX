// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it, vi } from "vitest";
import { etat, etatVide, type Objet } from "./etat";
import { CH_WH, chainSetPivot, chainSvgNode, paintChain, publierChaineDessin, type CaseChaine } from "./chaine-dessin";

const fenetre: Record<string, unknown> = {};
const paintRef = vi.fn();
const saveData = vi.fn();

beforeEach(() => {
  paintRef.mockReset();
  saveData.mockReset();
  for (const cle of Object.keys(fenetre)) Reflect.deleteProperty(fenetre, cle);
  publierChaineDessin(fenetre, null);
  Object.assign(fenetre, { paintRef, saveData });
  Object.assign(etat, etatVide());
  etat.donnees = {
    activeDiplome: "d1",
    diplomes: [
      { id: "d1", nom: "DN MADE", mention: "Objet" },
      { id: "d2", nom: "DN MADE", mention: "Espace" },
    ],
    ues: [
      { id: "u1", nom: "UE 1", code: "UE1", couleur: "#aa0000" },
      { id: "u2", nom: "UE 2", couleur: "#00aa00" },
    ],
    ecs: [
      { id: "e1", ueId: "u1", nom: "Dessin <croquis>", codes: { 1: "EC 1.1", 2: "EC 2.1" }, sems: ["S1", "S3"], couleur: "#123456" },
      { id: "e2", ueId: "u2", nom: "Volume", codes: { 1: "EC 1.2" }, sems: ["S2"] },
    ],
    competences: [
      { id: "c1", code: "C1.1", bloc: 1, libelle: "Dessiner", ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S1", "S3"] }] },
      { id: "c2", code: "C2.1", bloc: 2, libelle: "Modeler", ecIds: ["e2"], ecs: [{ id: "e2", sems: ["S2"] }] },
    ],
  };
  etat.ui = { ref: { filter: { kind: "", value: "" } } };
});

function carte(): Objet {
  return etat.ui.ref as Objet;
}

describe("publierChaineDessin", () => {
  it("publie le dessin et les gestes de la chaîne sous leurs noms historiques", () => {
    for (const nom of ["chainSvgNode", "paintChain", "chainSetPivot", "chainBind", "pivotWheel", "chainWire"]) {
      expect(typeof fenetre[nom]).toBe("function");
    }
  });
});

describe("chainSvgNode", () => {
  const caseDe = (champs: Partial<CaseChaine>): CaseChaine => ({ id: "ec:e1", kind: "ec", sel: "e1", col: "#123456", x: 10, y: 50, h: 47.5, t: ["Dessin"], ...champs });

  it("écrit le code, les lignes et les rectangles, arrondis au dixième", () => {
    const balisage = chainSvgNode(caseDe({ code: "EC 1.1", y: 50.04 }), 172);
    expect(balisage).toContain(`<text class="ccode" x="22" y="65.0">EC 1.1</text>`);
    expect(balisage).toContain(`<text class="cn" x="22" y="78.0">Dessin</text>`);
    expect(balisage).toContain(`<rect x="10" y="50.0" width="172" height="47.5" rx="7" class="cbox" style="--c:#123456"/>`);
    expect(balisage).toContain(`data-code0="EC 1.1"`);
  });

  it("coupe un sous-titre de plus de 32 caractères et échappe les valeurs", () => {
    const balisage = chainSvgNode(caseDe({ t: ["<b>"], sub: "x".repeat(40), strong: true }), 172);
    expect(balisage).toContain(`<text class="cn b" x="22" y="65.0">&lt;b&gt;</text>`);
    expect(balisage).toContain(">" + "x".repeat(31) + "…</text>");
    expect(balisage).not.toContain("ccode");
  });

  it("garde un sous-titre de 32 caractères entier", () => {
    expect(chainSvgNode(caseDe({ sub: "y".repeat(32) }), 172)).toContain(">" + "y".repeat(32) + "</text>");
  });
});

describe("paintChain", () => {
  it("annonce qu'aucun élément ne correspond quand le référentiel est vide", () => {
    etat.donnees = { ...etat.donnees, competences: [], ecs: [], ues: [] };
    expect(paintChain()).toBe(`<div class="empty">Aucun élément ne correspond au filtre.</div>`);
  });

  it("dessine cinq colonnes, la roue sur le pivot, et les cases liées", () => {
    const balisage = paintChain();
    expect(carte().piv).toEqual({ kind: "comp", id: "c1" });
    expect(balisage.match(/<rect class="ccol/g)).toHaveLength(5);
    expect(balisage).toContain(`<rect class="ccol alt piv" x="203" y="34" width="256"`);
    expect(balisage).toContain(`data-lock="comp" style="left:203px;width:256px"`);
    expect(balisage.indexOf(`data-lock="sem"`)).toBeLessThan(balisage.indexOf(`data-lock="comp"`));
    expect(balisage).toContain(`aria-pressed="true" title="Colonne verrouillée"`);
    expect(balisage).toContain(`id="ec:e1"`);
    expect(balisage).toContain("Dessin &lt;croquis&gt;");
    expect(balisage).not.toContain(`id="ec:e2"`);
    expect(balisage).toContain(`style="height:${String(CH_WH)}px"`);
  });

  it("donne aux EC le code de l'année du semestre verrouillé", () => {
    carte().piv = { kind: "sem", id: "S3" };
    const balisage = paintChain();
    expect(balisage).toContain(`data-code0="EC 2.1"`);
    expect(balisage).toContain(`aria-label="Semestre"`);
  });

  it("donne aux EC tous leurs codes quand plusieurs semestres sont en vue", () => {
    expect(paintChain()).toContain(`data-code0="EC 1.1 · 2.1"`);
  });

  it("agrandit la roue pour un intitulé long", () => {
    (etat.donnees.competences as Objet[])[0] = { ...(etat.donnees.competences as Objet[])[0], libelle: "mot ".repeat(60) };
    const hauteur = Number(/id="chainWheel"[^>]*style="height:(\d+)px"/.exec(paintChain())?.[1]);
    expect(hauteur).toBeGreaterThan(CH_WH);
  });

  it("remet à vide un filtre inconnu avant de dessiner", () => {
    carte().filter = { kind: "inconnu", value: "x" };
    paintChain();
    expect(carte().filter).toEqual({ kind: "", value: "" });
  });
});

describe("chainSetPivot", () => {
  it("retient le pivot, vide la saisie de la roue et redessine", () => {
    carte().wq = "des";
    chainSetPivot("ec", "e2");
    expect(carte().piv).toEqual({ kind: "ec", id: "e2" });
    expect(carte().wq).toBe("");
    expect(paintRef).toHaveBeenCalledTimes(1);
    expect(saveData).not.toHaveBeenCalled();
  });

  it("change de diplôme actif, remet le filtre à vide et enregistre", () => {
    carte().filter = { kind: "bloc", value: "2" };
    chainSetPivot("dip", "d2");
    expect(etat.donnees.activeDiplome).toBe("d2");
    expect(carte().filter).toEqual({ kind: "", value: "" });
    expect(saveData).toHaveBeenCalledTimes(1);
    expect(paintRef).not.toHaveBeenCalled();
  });

  it("redessine seulement quand le diplôme choisi est déjà actif", () => {
    chainSetPivot("dip", "d1");
    expect(etat.donnees.activeDiplome).toBe("d1");
    expect(paintRef).toHaveBeenCalledTimes(1);
    expect(saveData).not.toHaveBeenCalled();
  });
});
