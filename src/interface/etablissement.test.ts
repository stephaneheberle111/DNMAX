// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it, vi } from "vitest";
import { etat, etatVide } from "./etat";
import { aEuLaPromotionDonnee, armerSuppression, ecsDeLaPromotion, repartitionDe, repartitionLue } from "./etablissement";
import { brancherPromotionsCalendrier } from "./promotions-calendrier";

const dessins = vi.hoisted(() => [] as string[]);
vi.mock("./preferences-parametres", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./preferences-parametres")>()),
  paintPrefs: () => dessins.push("pref"),
}));
vi.mock("./referentiel", async (importOriginal) => ({ ...(await importOriginal<typeof import("./referentiel")>()), peindreReferentiel: () => dessins.push("ref") }));

beforeEach(() => {
  Object.assign(etat, etatVide());
  etat.donnees = {
    activeDiplome: "d1",
    diplomes: [{ id: "d1", nom: "DN MADE", mention: "Objet", code: "DNO" }],
    refs: { d1: { ues: [], ecs: [{ id: "e1", ueId: "", codes: { 1: "EC 1.1", 2: "EC 2.1" } }], blocs: [], competences: [] } },
    dico: { ues: [], ecs: [{ id: "e1", nom: "Atelier" }], blocs: [], competences: [] },
  };
  dessins.length = 0;
  brancherPromotionsCalendrier(() => undefined);
});

describe("répartition de service", () => {
  it("crée la répartition d'une promotion pour l'année demandée", () => {
    const repartition = repartitionDe("p1", "2026-2027");
    repartition.e1 = ["t1"];
    expect(etat.donnees.affectH).toEqual({ "2026-2027": { p1: { e1: ["t1"] } } });
  });

  it("lit sans rien créer", () => {
    expect(repartitionLue("p1", "2026-2027")).toEqual({});
    expect(etat.donnees.affectH).toEqual({});
  });

  it("sait si un enseignant a eu la promotion", () => {
    repartitionDe("p1", "2024-2025").e1 = ["t1"];
    expect(aEuLaPromotionDonnee("p1", "t1")).toBe(true);
    expect(aEuLaPromotionDonnee("p1", "t2")).toBe(false);
  });
});

describe("EC d'une promotion", () => {
  it("donne les EC de son année de formation à l'année scolaire demandée", () => {
    const promotion = { id: "p1", debut: 2025, diplomeId: "d1" };
    expect(ecsDeLaPromotion(promotion, "2026-2027").map((ec) => ec.code)).toEqual(["EC 2.1"]);
  });
});

describe("suppression en deux temps", () => {
  it("arme au premier clic et redessine l'onglet, sans supprimer", () => {
    etat.ui.tab = "pref";
    let supprime = false;
    armerSuppression("x", () => (supprime = true));
    expect([etat.armement, supprime, dessins]).toEqual(["x", false, ["pref"]]);
  });

  it("supprime au second clic sur le même bouton et désarme", () => {
    etat.ui.tab = "ref";
    let supprime = false;
    armerSuppression("x", () => (supprime = true));
    armerSuppression("x", () => (supprime = true));
    expect([etat.armement, supprime, dessins]).toEqual([null, true, ["ref"]]);
  });

  it("réarme sur un autre bouton sans supprimer", () => {
    etat.ui.tab = "ref";
    let supprime = false;
    armerSuppression("x", () => (supprime = true));
    armerSuppression("y", () => (supprime = true));
    expect([etat.armement, supprime]).toEqual(["y", false]);
  });
});
