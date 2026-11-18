// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { aEuLaPromotion, anneesProposees, ecsDeLAnnee } from "./repartition";

const DICTIONNAIRE = {
  ues: [{ id: "u1", nom: "UE 1", couleur: "#111111" }],
  ecs: [
    { id: "e1", nom: "Atelier", couleur: "#222222" },
    { id: "e2", nom: "" },
  ],
};

describe("EC de l'année d'une promotion", () => {
  it("garde les EC qui ont un code cette année-là, rangés par numéro, avec nom, couleur et UE", () => {
    const ecs = [
      { id: "e1", ueId: "u1", codes: { 2: "EC 10.2" } },
      { id: "e2", ueId: "u1", codes: { 2: "EC 2.1" } },
    ];
    expect(ecsDeLAnnee(ecs, DICTIONNAIRE, 2)).toEqual([
      { id: "e2", code: "EC 2.1", nom: "EC 2.1", couleur: "#111111", ue: "UE 1", ueId: "u1" },
      { id: "e1", code: "EC 10.2", nom: "Atelier", couleur: "#222222", ue: "UE 1", ueId: "u1" },
    ]);
  });

  it("écarte un EC sans code pour l'année", () => {
    expect(ecsDeLAnnee([{ id: "e1", ueId: "u1", codes: { 1: "EC 1.1" } }], DICTIONNAIRE, 2)).toEqual([]);
  });

  it("donne une couleur neutre à un EC inconnu du dictionnaire et sans UE", () => {
    expect(ecsDeLAnnee([{ id: "x", codes: { 1: "EC 1.1" } }], {}, 1)).toEqual([{ id: "x", code: "EC 1.1", nom: "EC 1.1", couleur: "#9aa2ae", ue: "", ueId: "" }]);
  });
});

describe("années scolaires proposées", () => {
  it("propose l'année en cours et les quatre précédentes", () => {
    expect(anneesProposees(2026)).toEqual(["2026-2027", "2025-2026", "2024-2025", "2023-2024", "2022-2023"]);
  });
});

describe("enseignant qui a eu une promotion", () => {
  const HISTORIQUE = { "2025-2026": { p1: { e1: ["t1"] } }, "2026-2027": { p1: { e2: ["t2"] } } };

  it("est vrai s'il en a assuré un EC une année ou une autre", () => {
    expect(aEuLaPromotion(HISTORIQUE, "p1", "t1")).toBe(true);
  });

  it("est faux pour un autre enseignant ou une autre promotion", () => {
    expect(aEuLaPromotion(HISTORIQUE, "p1", "t3")).toBe(false);
    expect(aEuLaPromotion(HISTORIQUE, "p2", "t1")).toBe(false);
  });

  it("est faux sans enseignant, et tolère des entrées absentes", () => {
    expect(aEuLaPromotion(HISTORIQUE, "p1", "")).toBe(false);
    expect(aEuLaPromotion({ "2024-2025": null, "2025-2026": { p1: { e1: null } } }, "p1", "t1")).toBe(false);
  });
});
