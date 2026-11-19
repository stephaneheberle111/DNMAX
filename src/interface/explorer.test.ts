// SPDX-License-Identifier: CECILL-2.1
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { etat, etatVide, type Objet } from "./etat";
import { paintExplore, paintMap, brancherExplorer } from "./explorer";
import { MODES_REGROUPEMENT } from "./constantes";

const { paintRef, saveData, allerEtape } = vi.hoisted(() => ({ paintRef: vi.fn(), saveData: vi.fn(), allerEtape: vi.fn() }));
vi.mock("./referentiel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./referentiel")>()),
  peindreReferentiel: paintRef,
  allerALEtape: allerEtape,
}));
vi.mock("./donnees", async (importOriginal) => ({ ...(await importOriginal<typeof import("./donnees")>()), saveData }));
vi.mock("./promotions-calendrier", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./promotions-calendrier")>()),
  libelleAnnee: (annee: unknown) => "Année " + String(annee),
  semestresDeLaAnnee: () => ["S1", "S2"],
}));
vi.mock("./versions-referentiel", async (importOriginal) => ({ ...(await importOriginal<typeof import("./versions-referentiel")>()), referentielAJour: () => true }));

const fenetre: Record<string, unknown> = {};
const peindreHabillageCarte = vi.fn();
const peindreRecherche = vi.fn();
const recherche = { hidden: false };
const hote = { querySelector: () => null } as unknown as HTMLElement;
const page = { getElementById: (id: string) => (id === "refMeta" ? hote : id === "refSearch" ? recherche : null) } as unknown as Document;

beforeEach(() => {
  for (const espion of [paintRef, saveData, allerEtape, peindreHabillageCarte, peindreRecherche]) espion.mockReset();
  for (const cle of Object.keys(fenetre)) Reflect.deleteProperty(fenetre, cle);
  brancherExplorer(page);
  vi.stubGlobal("window", { dnmaxPont: { referentiel: { peindreHabillageCarte, peindreRecherche } } });
  Object.assign(etat, etatVide());
  etat.donnees = {
    activeDiplome: "d1",
    diplomes: [
      { id: "d1", nom: "DN MADE", mention: "Objet" },
      { id: "d2", nom: "DN Métiers", mention: "Espace" },
    ],
    ues: [{ id: "u1", nom: "UE 1", couleur: "#aa0000" }],
    ecs: [
      { id: "e2", ueId: "u1", nom: "Volume", codes: { 1: "EC 1.2" }, sems: ["S2"] },
      { id: "e1", ueId: "u1", nom: "Dessin", codes: { 1: "EC 1.1" }, sems: ["S1"] },
      { id: "e3", ueId: "absente", nom: "Orphelin", codes: { 1: "EC 1.3" }, sems: ["S1"] },
    ],
    competences: [{ id: "c1", code: "C1.1", bloc: 1, ecIds: ["e1"], ecs: [{ id: "e1", sems: ["S1"] }] }],
    versions: [],
  };
  etat.referentiel = { meta: { diplome: "DN MADE", niveaux: [{ annee: 1, label: "Découverte" }] }, ues: [], blocs: [], competences: [] };
  etat.ui = { ref: { filter: { kind: "", value: "" } } };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function contexteHabillage(): Record<string, unknown> {
  return peindreHabillageCarte.mock.calls[0]?.[1] as Record<string, unknown>;
}

function carte(): Objet {
  return etat.ui.ref as Objet;
}

describe("paintMap", () => {
  it("passe la vue radiale par défaut, sans tableau, et les EC rangés par code", () => {
    paintMap();
    expect(peindreHabillageCarte).toHaveBeenCalledTimes(1);
    expect(peindreHabillageCarte.mock.calls[0]?.[0]).toBe(hote);
    const contexte = contexteHabillage();
    expect(contexte.vue).toBe("radial");
    expect(contexte.groupesTableau).toEqual([]);
    expect((contexte.ecs as Objet[]).map((ec) => ec.id)).toEqual(["e1", "e2", "e3"]);
    expect(contexte.niveaux).toBeNull();
  });

  it("prépare le tableau EC × semestres : UE, puis EC sans UE", () => {
    carte().view = "table";
    paintMap();
    const groupes = contexteHabillage().groupesTableau as { ue: Objet; ecs: Objet[]; competences: number }[];
    expect(groupes.map((g) => [g.ue.nom, g.ecs.map((ec) => ec.id), g.competences])).toEqual([
      ["UE 1", ["e1", "e2"], 1],
      ["Sans UE", ["e3"], 0],
    ]);
  });

  it("filtrer pose le filtre et, dans la chaîne, déplace le pivot de même sorte", () => {
    carte().view = "chain";
    carte().piv = { kind: "ec", id: "e2" };
    paintMap();
    (contexteHabillage().filtrer as (sorte: string, valeur: string) => void)("ec", "e1");
    expect(carte().filter).toEqual({ kind: "ec", value: "e1" });
    expect(carte().piv).toEqual({ kind: "ec", id: "e1" });
    expect(paintRef).toHaveBeenCalledTimes(1);
  });

  it("filtrer sans valeur remet le filtre à vide et garde le pivot", () => {
    carte().view = "chain";
    carte().piv = { kind: "ec", id: "e2" };
    paintMap();
    (contexteHabillage().filtrer as (sorte: string, valeur: string) => void)("ec", "");
    expect(carte().filter).toEqual({ kind: "", value: "" });
    expect(carte().piv).toEqual({ kind: "ec", id: "e2" });
  });

  it("choisirDiplome change de diplôme actif, ou rend faux pour un nom inconnu", () => {
    paintMap();
    const choisir = contexteHabillage().choisirDiplome as (nom: string) => boolean;
    expect(choisir("dn metiers")).toBe(true);
    expect(etat.donnees.activeDiplome).toBe("d2");
    expect(saveData).toHaveBeenCalledTimes(1);
    expect(choisir("Inconnu")).toBe(false);
    expect(saveData).toHaveBeenCalledTimes(1);
  });

  it("allerALEc ouvre l'étape des EC filtrée sur ce nom", () => {
    paintMap();
    (contexteHabillage().allerALEc as (nom: string) => void)("Dessin");
    expect(allerEtape).toHaveBeenCalledWith("ecs", "Dessin");
  });
});

describe("paintExplore", () => {
  it("dessine la carte puis la recherche, masquée hors de la vue « Recherche »", () => {
    paintExplore();
    expect(peindreHabillageCarte).toHaveBeenCalledTimes(1);
    expect(recherche.hidden).toBe(true);
    const contexte = peindreRecherche.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(contexte.modes).toBe(MODES_REGROUPEMENT);
    expect(contexte.annees).toEqual([{ annee: "1", libelle: "Année 1" }]);
    expect(contexte.diplome).toBe("DN MADE");
    expect(contexte.redessiner).toBe(paintRef);
    expect((contexte.sousTitreAnnee as (p: Objet) => string)({ annee: 1, dn: "DNO1" })).toBe("Semestres S1 et S2");
  });

  it("montre la recherche dans sa vue, et les niveaux quand le module est actif", () => {
    carte().view = "search";
    etat.modules = { dn: true };
    paintExplore();
    expect(recherche.hidden).toBe(false);
    const contexte = peindreRecherche.mock.calls[0]?.[0] as Record<string, unknown>;
    expect((contexte.sousTitreAnnee as (p: Objet) => string)({ annee: 1, dn: "DNO1" })).toBe("DNO1 · Découverte");
    expect((contexte.sousTitreSemestre as (p: Objet) => string)({ annee: 1, dn: "DNO1" })).toBe("Année 1 · DNO1");
  });
});
