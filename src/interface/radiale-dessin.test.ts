// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide } from "./etat";
import { anneeOf, brancherRadialeDessin, paintRadial, radInfo, roue, tlabel } from "./radiale-dessin";

const fenetre: Record<string, unknown> = {};
const encadre = { innerHTML: "" };
let avecEncadre = true;
const page = { getElementById: (id: string) => (id === "radInfo" && avecEncadre ? encadre : null) } as unknown as Document;

beforeEach(() => {
  for (const cle of Object.keys(fenetre)) Reflect.deleteProperty(fenetre, cle);
  brancherRadialeDessin(page);
  roue.angle = 0;
  encadre.innerHTML = "";
  avecEncadre = true;
  Object.assign(etat, etatVide());
  etat.donnees = {
    activeDiplome: "d1",
    ues: [
      { id: "u1", nom: "UE 1 Arts", code: "UE1", couleur: "#aa0000" },
      { id: "u2", nom: "UE 2", couleur: "#00aa00" },
    ],
    ecs: [
      { id: "e1", ueId: "u1", nom: "Dessin <croquis>", codes: { 1: "EC 1.1", 2: "EC 2.1" }, sems: ["S1", "S3"], couleur: "#123456" },
      { id: "e2", ueId: "u2", nom: "Volume", codes: { 1: "EC 1.2" }, sems: ["S2"] },
      { id: "e3", ueId: "u2", nom: "", sems: [] },
    ],
    blocs: [{ num: "1", nom: "Créer" }],
    competences: [
      { id: "c1", code: "C1.1", bloc: 1, libelle: "Dessiner", ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S1", "S3"] }] },
      { id: "c2", code: "C2.1", bloc: 2, libelle: "Modeler", ecIds: ["e1", "e2"], ecs: [{ id: "e1", sems: ["S1"] }, { id: "e2", sems: ["S2"] }] },
    ],
  };
  etat.referentiel = { meta: { diplome: "DN MADE", mention: "Objet" } };
  etat.ui = { ref: { filter: { kind: "", value: "" } } };
});

describe("anneeOf", () => {
  it("rend l'année d'un semestre", () => {
    expect(["S1", "S2", "S3", "S4", "S5", "S6"].map(anneeOf)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("compte un semestre inconnu pour la première année", () => {
    expect(anneeOf("S9")).toBe(1);
    expect(anneeOf(undefined)).toBe(1);
  });
});

describe("tlabel", () => {
  it("centre les lignes autour du point, arrondies au dixième, texte échappé", () => {
    expect(tlabel(10.04, 20, ["a<b", "c"], "lue", 10, 11)).toBe(
      `<text class="lbl lue" data-x="10.0" data-y="20.0" font-size="10" text-anchor="middle"><tspan x="10.0" y="14.5">a&lt;b</tspan><tspan x="10.0" y="25.5">c</tspan></text>`,
    );
  });

  it("ne rend rien sans ligne", () => {
    expect(tlabel(0, 0, [], "lue", 10, 11)).toBe("");
  });
});

describe("paintRadial", () => {
  it("dessine un secteur par UE, EC et année, un point par compétence d'EC, et le cœur du diplôme", () => {
    const svg = paintRadial();
    expect(svg.startsWith(`<svg viewBox="-100 -100 960 960" class="radial" role="img" aria-label="Carte du référentiel">`)).toBe(true);
    expect(svg.match(/data-kind="ue"/g)).toHaveLength(2);
    expect(svg.match(/<g class="sg" data-sel="[^"]*" data-kind="ec"/g)).toHaveLength(3);
    // e1 : années 1 et 2 séparées ; e2 : année 1 ; e3, sans semestre : une part « — »
    expect(svg).toContain(`data-kind="an" data-id="e1" data-sem="1"`);
    expect(svg).toContain(`data-kind="an" data-id="e1" data-sem="2"`);
    expect(svg).toContain(`data-sel="e3|0" data-kind="an" data-id="e3" data-sem="0"`);
    expect(svg.match(/<circle class="dot"/g)).toHaveLength(3);
    expect(svg).toContain(`<title>C1.1 · Dessiner</title>`);
    expect(svg).toContain(`<text class="lhub" x="380" y="372.0" text-anchor="middle" dominant-baseline="middle">DN MADE</text>`);
    expect(svg).toContain(`<text class="lmen" x="380" y="388.0" text-anchor="middle" dominant-baseline="middle">mention Objet</text>`);
    expect(svg).toContain(`<g id="wheelRot" transform="rotate(0.00 380 380)">`);
    expect(svg).toContain(`&lt;croquis&gt;`);
  });

  it("tourne la roue selon l'angle partagé", () => {
    roue.angle = 33.456;
    expect(paintRadial()).toContain(`transform="rotate(33.46 380 380)"`);
  });

  it("suit le filtre : une UE seule, sans diplôme nommé", () => {
    etat.ui = { ref: { filter: { kind: "ue", value: "UE 2" } } };
    etat.referentiel = {};
    const svg = paintRadial();
    expect(svg.match(/data-kind="ue"/g)).toHaveLength(1);
    expect(svg).toContain(`>Aucun diplôme</text>`);
    expect(svg).not.toContain(`class="lmen"`);
  });

  it("dessine une roue vide sans UE ni EC", () => {
    etat.donnees = { ues: [], ecs: [], competences: [] };
    const svg = paintRadial();
    expect(svg).not.toContain(`class="sg"`);
    expect(svg).toContain(`<circle class="hub" cx="380" cy="380" r="84"/>`);
  });
});

describe("radInfo", () => {
  it("invite à survoler, sans sélection", () => {
    radInfo(null);
    expect(encadre.innerHTML).toContain(`<div class="k">Carte du référentiel</div>`);
  });

  it("détaille une UE : ses EC et ses compétences", () => {
    radInfo("ue", "UE 1 Arts", false, "");
    expect(encadre.innerHTML).toContain(`<div class="rail" style="--c:#aa0000"></div>`);
    expect(encadre.innerHTML).toContain(`<b class="ttl">1 Arts</b>`);
    expect(encadre.innerHTML).toContain(`<div class="s">1 enseignement · 2 compétences</div>`);
    expect(encadre.innerHTML).not.toContain(`class="fz"`);
  });

  it("détaille un EC, figé : codes par année et semestres", () => {
    radInfo("ec", "e1", true, "");
    expect(encadre.innerHTML).toContain(`<b class="ttl">Dessin &lt;croquis&gt;</b>`);
    expect(encadre.innerHTML).toContain(`<div class="s">S1 S3 · 2 compétences</div>`);
    expect(encadre.innerHTML).toContain(`<div class="fz">Figé · survole la roue pour relâcher</div>`);
  });

  it("détaille l'année d'un EC : compétences évaluées cette année-là", () => {
    radInfo("an", "e1|2", false, "");
    expect(encadre.innerHTML).toContain(`<b class="ttl">EC 2.1 · Dessin &lt;croquis&gt;</b>`);
    expect(encadre.innerHTML).toContain(`<div class="s">1 compétence évaluée</div>`);
  });

  it("détaille une compétence : bloc, EC rattachés, teinte reçue", () => {
    radInfo("comp", "C1.1", false, "#ff0000");
    expect(encadre.innerHTML).toContain(`<div class="rail" style="--c:#ff0000"></div>`);
    expect(encadre.innerHTML).toContain(`<div class="cr">Bloc 1 · Créer</div>`);
    expect(encadre.innerHTML).toContain(`<span class="pill c" style="--c:#123456"`);
  });

  it("reste sans effet quand l'encadré est absent", () => {
    avecEncadre = false;
    radInfo("ue", "UE 1 Arts");
    expect(encadre.innerHTML).toBe("");
  });
});
