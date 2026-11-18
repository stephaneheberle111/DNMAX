// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { autresPromotionsMontrees, basculerEc, basculerUe, cadreDuSemestre, promotionsBloquees, rangEc, separerMiennes, uesRetenues } from "./cadre-evaluation";

const ECS = [
  { ec: "EC 1.1", ue: "UE 1" },
  { ec: "EC 1.2", ue: "UE 1" },
  { ec: "EC 10.1", ue: "UE 3" },
];

describe("rangEc", () => {
  it("range les EC par numéro, pas par ordre alphabétique", () => {
    expect(rangEc("EC 2.3")).toBeLessThan(rangEc("EC 10.1"));
  });

  it("met à la fin un code sans nombre", () => {
    expect(rangEc("Atelier")).toBe(9999);
  });
});

describe("basculerUe", () => {
  it("coche une UE avec tous ses EC, triés", () => {
    expect(basculerUe({ ues: [], ecCodes: ["EC 10.1"] }, "UE 1", ECS)).toEqual({ ues: ["UE 1"], ecCodes: ["EC 1.1", "EC 1.2", "EC 10.1"] });
  });

  it("décoche une UE avec ses EC, sans toucher aux autres", () => {
    expect(basculerUe({ ues: ["UE 1"], ecCodes: ["EC 1.1", "EC 1.2", "EC 10.1"] }, "UE 1", ECS)).toEqual({ ues: [], ecCodes: ["EC 10.1"] });
  });
});

describe("basculerEc", () => {
  it("retient l'UE d'un EC coché", () => {
    expect(basculerEc({ ues: [], ecCodes: [] }, "EC 1.2", ECS)).toEqual({ ues: ["UE 1"], ecCodes: ["EC 1.2"] });
  });

  it("garde l'UE tant qu'il lui reste un EC, la retire avec le dernier", () => {
    const deux = { ues: ["UE 1"], ecCodes: ["EC 1.1", "EC 1.2"] };
    expect(basculerEc(deux, "EC 1.1", ECS).ues).toEqual(["UE 1"]);
    expect(basculerEc({ ues: ["UE 1"], ecCodes: ["EC 1.2"] }, "EC 1.2", ECS)).toEqual({ ues: [], ecCodes: [] });
  });

  it("bascule un EC inconnu du semestre sans toucher aux UE", () => {
    expect(basculerEc({ ues: ["UE 1"], ecCodes: [] }, "EC 9.9", ECS)).toEqual({ ues: ["UE 1"], ecCodes: ["EC 9.9"] });
  });
});

describe("cadreDuSemestre", () => {
  it("oublie les UE et EC qui ne sont pas proposés au semestre", () => {
    expect(cadreDuSemestre({ ues: ["UE 1", "UE 9"], ecCodes: ["EC 1.1", "EC 9.9"] }, ECS)).toEqual({ ues: ["UE 1"], ecCodes: ["EC 1.1"] });
  });
});

describe("uesRetenues", () => {
  it("ajoute aux UE cochées celles des EC cochés seuls", () => {
    expect(uesRetenues({ ues: ["UE 3"], ecCodes: ["EC 1.2"] }, ECS)).toEqual(["UE 3", "UE 1"]);
  });
});

describe("promotionsBloquees", () => {
  const promotions = [
    { nom: "DNO1", annee: 1 },
    { nom: "DNO2", annee: 2 },
    { nom: "DNE2", annee: 2 },
    { nom: "Ancienne", annee: null },
  ];

  it("bloque les promotions d'une autre année que la première cochée", () => {
    expect([...promotionsBloquees(promotions, ["DNO2"])]).toEqual(["DNO1"]);
  });

  it("ne bloque rien tant qu'aucune promotion n'est cochée", () => {
    expect(promotionsBloquees(promotions, []).size).toBe(0);
  });

  it("ne bloque rien quand l'année de la promotion cochée est inconnue", () => {
    expect(promotionsBloquees(promotions, ["Ancienne"]).size).toBe(0);
  });
});

describe("separerMiennes", () => {
  const promotions = [
    { nom: "DNO1", mienne: true },
    { nom: "DNE1", mienne: false },
    { nom: "DNO2", mienne: true },
  ];

  it("met d'abord les promotions de ma répartition de service, dans leur ordre", () => {
    expect(separerMiennes(promotions).miennes.map((promotion) => promotion.nom)).toEqual(["DNO1", "DNO2"]);
  });

  it("range à part les autres promotions", () => {
    expect(separerMiennes(promotions).autres.map((promotion) => promotion.nom)).toEqual(["DNE1"]);
  });

  it("ne range rien à part quand toutes sont miennes", () => {
    expect(separerMiennes([{ nom: "DNO1", mienne: true }]).autres).toEqual([]);
  });
});

describe("autresPromotionsMontrees", () => {
  const AUTRES = [{ nom: "DNE-2025-2028" }, { nom: "DNG-2026-2029" }];

  it("masque par défaut les promotions hors de ma répartition, sauf celles déjà cochées", () => {
    expect(autresPromotionsMontrees(AUTRES, ["DNG-2026-2029"], false, true)).toEqual([{ nom: "DNG-2026-2029" }]);
  });

  it("les montre toutes quand je le demande", () => {
    expect(autresPromotionsMontrees(AUTRES, [], true, true)).toEqual(AUTRES);
  });

  it("les montre toutes quand je n'ai encore aucune promotion à moi", () => {
    expect(autresPromotionsMontrees(AUTRES, [], false, false)).toEqual(AUTRES);
  });
});
