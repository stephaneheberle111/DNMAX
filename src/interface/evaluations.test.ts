// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide } from "./etat";
import { evaluationsIndividuelles, mesPromotions, promotionsDe, brancherEvaluations, suiviDe, suiviSimplifie } from "./evaluations";

let entrees: Map<string, string>;

beforeEach(() => {
  Object.assign(etat, etatVide());
  entrees = new Map();
  brancherEvaluations(
    (cle, valeur) => {
      entrees.set(cle, valeur);
    },
    (cle) => entrees.get(cle) ?? null,
  );
  etat.promotions = [
    { id: "p1", nom: "DNO-2025-2028" },
    { id: "p2", nom: "DNO-2026-2029" },
  ];
});

describe("suivi d'une évaluation", () => {
  it("complète la date de saisie d'une évaluation ancienne par sa date", () => {
    const evaluation: Record<string, unknown> = { date: "2026-10-01" };
    expect(suiviDe(evaluation)).toEqual({ saisie: "2026-10-01" });
  });

  it("garde un suivi existant", () => {
    const evaluation: Record<string, unknown> = { suivi: { saisie: "2026-09-01", distrib: "2026-09-02" } };
    expect(suiviDe(evaluation)).toEqual({ saisie: "2026-09-01", distrib: "2026-09-02" });
  });
});

describe("évaluations individuelles", () => {
  it("compte les étudiants qui ont un niveau, une observation, une appréciation ou une restitution", () => {
    const evaluation = { res: { a: { n: { c: 2 } }, b: { obs: { c: "bien" } }, c: { appr: "ok" }, d: { rest: "2026-11-01" }, e: { n: { c: "" } }, f: null } };
    expect(evaluationsIndividuelles(evaluation)).toBe(4);
  });

  it("vaut zéro sans résultats", () => {
    expect(evaluationsIndividuelles({})).toBe(0);
  });
});

describe("promotions d'une évaluation", () => {
  it("lit ses classes, puis ajoute sa promotion si elle manque", () => {
    expect(promotionsDe({ classes: ["DNO-2025-2028"], promoId: "p2" }).map((promotion) => promotion.id)).toEqual(["p1", "p2"]);
  });

  it("lit une ancienne liste de classes séparées par des virgules", () => {
    expect(promotionsDe({ classe: "DNO-2025-2028, inconnue" }).map((promotion) => promotion.id)).toEqual(["p1"]);
  });
});

describe("mes promotions", () => {
  it("laisse tout visible sans « C'est moi »", () => {
    expect(mesPromotions()).toBeNull();
  });

  it("ne garde que les promotions de ma répartition de service", () => {
    etat.donnees = { moi: "t1", affectH: { "2026-2027": { p2: { e1: ["t1"] } } } };
    expect(mesPromotions()).toEqual(new Set(["p2"]));
  });

  it("laisse tout visible tant que je n'ai aucune affectation", () => {
    etat.donnees = { moi: "t1", affectH: {} };
    expect(mesPromotions()).toBeNull();
  });
});

describe("suivi simplifié", () => {
  it("se lit dans les réglages, et vaut faux s'ils sont absents ou illisibles", () => {
    expect(suiviSimplifie()).toBe(false);
    entrees.set("dnmade.reglages", JSON.stringify({ suiviSimplifie: true }));
    expect(suiviSimplifie()).toBe(true);
    entrees.set("dnmade.reglages", "{");
    expect(suiviSimplifie()).toBe(false);
  });
});
