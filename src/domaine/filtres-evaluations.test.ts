// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { correspondFiltres, filtresActifs, filtresParDefaut, normaliserFiltres, profsDe, resumeFiltre, type OutilsFiltres } from "./filtres-evaluations";

const promotions = { p1: { id: "p1", nom: "DNO-2025-2028" }, p2: { id: "p2", nom: "DNO-2020-2023" } };
const outils = (changements: Partial<OutilsFiltres> = {}): OutilsFiltres => ({
  visibles: null,
  promotionsDe: (evaluation) => (evaluation.promoId === "p1" ? [promotions.p1] : evaluation.promoId === "p2" ? [promotions.p2] : []),
  enCours: (promotion) => promotion.id === "p1",
  moi: "Camille Durand",
  statut: (evaluation) => (typeof evaluation.statut === "string" ? evaluation.statut : "prep"),
  ...changements,
});

describe("filtresParDefaut et filtresActifs", () => {
  it("montre par défaut les promotions en cours, et ne compte pas ce réglage comme un filtre posé", () => {
    expect(filtresParDefaut()).toEqual({ per: ["cur"], mine: true, sem: [], st: [], q: "" });
    expect(filtresActifs(filtresParDefaut())).toBe(false);
    expect(filtresActifs({ ...filtresParDefaut(), q: "maquette" })).toBe(true);
  });
});

describe("normaliserFiltres", () => {
  it("ramène une ancienne valeur unique à une liste, et « all » à aucune sélection", () => {
    const filtres: Record<string, unknown> = { per: "p1", sem: "all", st: undefined, q: "" };
    normaliserFiltres(filtres);
    expect(filtres).toMatchObject({ per: ["p1"], sem: [], st: [] });
  });
});

describe("correspondFiltres", () => {
  it("retient une évaluation d'une promotion en cours, et écarte une promotion terminée", () => {
    expect(correspondFiltres({ promoId: "p1" }, filtresParDefaut(), outils())).toBe(true);
    expect(correspondFiltres({ promoId: "p2" }, filtresParDefaut(), outils())).toBe(false);
  });

  it("garde une évaluation sans promotion avec « Promotions en cours »", () => {
    expect(correspondFiltres({}, filtresParDefaut(), outils())).toBe(true);
  });

  it("filtre par semestre, suivi et intitulé, sans tenir compte de la casse", () => {
    const filtres = { per: [], mine: true, sem: ["S3"], st: ["eval"], q: "MAQ" };
    expect(correspondFiltres({ semestre: "S3", statut: "eval", titre: "Maquette" }, filtres, outils())).toBe(true);
    expect(correspondFiltres({ semestre: "S1", statut: "eval", titre: "Maquette" }, filtres, outils())).toBe(false);
    expect(correspondFiltres({ semestre: "S3", statut: "prep", titre: "Maquette" }, filtres, outils())).toBe(false);
    expect(correspondFiltres({ semestre: "S3", statut: "eval", titre: "Carnet" }, filtres, outils())).toBe(false);
  });

  it("ne montre que les promotions de la répartition de service, ou les évaluations dont je suis l'enseignant", () => {
    const vue = outils({ visibles: new Set(["p2"]) });
    const tout = { per: [], mine: true, sem: [], st: [], q: "" };
    expect(correspondFiltres({ promoId: "p1" }, tout, vue)).toBe(false);
    expect(correspondFiltres({ promoId: "p1", profs: ["Camille Durand"] }, tout, vue)).toBe(true);
  });
});

describe("profsDe", () => {
  it("lit la liste des enseignants, ou à défaut l'ancien champ texte", () => {
    expect(profsDe({ profs: ["A", "B"] })).toEqual(["A", "B"]);
    expect(profsDe({ prof: "A, B" })).toEqual(["A", "B"]);
    expect(profsDe({})).toEqual([]);
  });
});

describe("resumeFiltre", () => {
  const noms = { nomPromotion: (id: string) => (id === "p1" ? "DNO1" : ""), libelleStatut: (cle: string) => (cle === "eval" ? "Évaluée" : cle) };

  it("résume les promotions choisies, au-delà de deux par leur nombre", () => {
    expect(resumeFiltre("per", [], noms)).toBe("Toutes les promotions");
    expect(resumeFiltre("per", ["cur", "p1"], noms)).toBe("En cours, DNO1");
    expect(resumeFiltre("per", ["cur", "p1", "p2"], noms)).toBe("3 sélections");
  });

  it("résume les semestres dans leur ordre et les suivis par leur libellé", () => {
    expect(resumeFiltre("sem", ["S3", "S1"], noms)).toBe("S1, S3");
    expect(resumeFiltre("sem", [], noms)).toBe("Tous les semestres");
    expect(resumeFiltre("st", ["eval"], noms)).toBe("Évaluée");
    expect(resumeFiltre("st", ["eval", "prep"], noms)).toBe("2 suivis");
    expect(resumeFiltre("st", [], noms)).toBe("Tous les suivis");
  });
});
