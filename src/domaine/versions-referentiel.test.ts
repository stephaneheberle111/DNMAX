// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  diplomeBloquant,
  mentionDeLEvaluation,
  nombreEtudiants,
  promotionDeLEvaluation,
  promotionsDeLEvaluation,
  referentielIdentique,
  usageDeLaVersion,
  versionDeLaPromotion,
  versionDeLEvaluation,
} from "./versions-referentiel";

const P1 = { id: "p1", nom: "DNO-2025-2028", diplomeId: "d1" };
const P2 = { id: "p2", nom: "DNO-2026-2029", diplomeId: "d1", refV: "v1" };
const P3 = { id: "p3", nom: "DNE-2026-2028", diplomeId: "d2" };
const PROMOTIONS = [P1, P2, P3];
const VERSIONS = [{ id: "v2" }, { id: "v1" }];

describe("promotions d'une évaluation", () => {
  it("prend sa promotion puis celles de ses classes, sans doublon", () => {
    expect(promotionsDeLEvaluation({ promoId: "p2", classes: ["DNO-2025-2028", "DNO-2026-2029"] }, PROMOTIONS)).toEqual([P2, P1]);
  });

  it("ignore les classes qui ne sont pas des promotions", () => {
    expect(promotionsDeLEvaluation({ classes: ["Groupe libre"] }, PROMOTIONS)).toEqual([]);
  });

  it("supporte une évaluation sans promotion ni classes", () => {
    expect(promotionsDeLEvaluation({}, PROMOTIONS)).toEqual([]);
    expect(promotionDeLEvaluation({}, PROMOTIONS)).toBeNull();
  });

  it("rend sa promotion, sinon la première de ses classes qui existe", () => {
    expect(promotionDeLEvaluation({ promoId: "inconnue", classes: ["x", "DNE-2026-2028"] }, PROMOTIONS)).toBe(P3);
  });
});

describe("mention d'une évaluation", () => {
  const DIPLOMES = [{ id: "d1" }];

  it("rend la mention de sa promotion", () => {
    expect(mentionDeLEvaluation({ promoId: "p1" }, PROMOTIONS, DIPLOMES)).toBe("d1");
  });

  it("rend un texte vide si la mention a disparu", () => {
    expect(mentionDeLEvaluation({ promoId: "p3" }, PROMOTIONS, DIPLOMES)).toBe("");
  });

  it("rend un texte vide sans promotion", () => {
    expect(mentionDeLEvaluation({}, PROMOTIONS, DIPLOMES)).toBe("");
  });
});

describe("version suivie par une promotion", () => {
  it("garde la version qui lui a été appliquée", () => {
    expect(versionDeLaPromotion(P2, VERSIONS, "v2")).toBe("v1");
  });

  it("prend la version en vigueur sans choix explicite", () => {
    expect(versionDeLaPromotion(P1, VERSIONS, "v2")).toBe("v2");
  });

  it("prend la version en vigueur si la sienne a disparu, et rien sans promotion ni version", () => {
    expect(versionDeLaPromotion({ ...P2, refV: "v0" }, VERSIONS, "v2")).toBe("v2");
    expect(versionDeLaPromotion(P1, VERSIONS, undefined)).toBe("");
    expect(versionDeLaPromotion(null, VERSIONS, "v2")).toBe("");
  });
});

describe("version suivie par une évaluation", () => {
  it("garde la version sur laquelle elle a été faite", () => {
    expect(versionDeLEvaluation({ refV: "v1" }, P1, "d1", VERSIONS, "v2")).toEqual({ id: "v1" });
  });

  it("suit sa promotion sans version propre", () => {
    expect(versionDeLEvaluation({}, P2, "d1", VERSIONS, "v2")).toEqual({ id: "v1" });
  });

  it("ne rend rien pour une promotion d'une autre mention ou absente", () => {
    expect(versionDeLEvaluation({ refV: "v1" }, P3, "d1", VERSIONS, "v2")).toBeNull();
    expect(versionDeLEvaluation({ refV: "v1" }, null, "d1", VERSIONS, "v2")).toBeNull();
  });

  it("ne rend rien si aucune version n'existe", () => {
    expect(versionDeLEvaluation({}, P1, "d1", [], undefined)).toBeNull();
  });
});

describe("référentiel identique à une version", () => {
  const SORTES = ["ues", "ecs"];

  it("est vrai pour le même contenu", () => {
    expect(referentielIdentique({ ues: [{ id: "u" }], ecs: [] }, { ues: [{ id: "u" }], ecs: [], autre: 1 }, SORTES)).toBe(true);
  });

  it("est faux dès qu'une sorte diffère", () => {
    expect(referentielIdentique({ ues: [{ id: "u" }], ecs: [] }, { ues: [{ id: "u" }], ecs: [{ id: "e" }] }, SORTES)).toBe(false);
  });

  it("compte l'ordre des champs, comme avant", () => {
    expect(referentielIdentique({ ues: [{ id: "u", nom: "A" }], ecs: [] }, { ues: [{ nom: "A", id: "u" }], ecs: [] }, SORTES)).toBe(false);
  });
});

describe("usage d'une version", () => {
  const suivie = (promotion: Record<string, unknown>): string => versionDeLaPromotion(promotion, VERSIONS, "v2");

  it("liste les promotions de la mention qui la suivent et les évaluations faites dessus", () => {
    const evaluations = [{ id: "f1", refV: "v1" }, { id: "f2", refV: "v2" }, { id: "f3" }];
    expect(usageDeLaVersion("d1", "v1", PROMOTIONS, evaluations, suivie)).toEqual({ ps: [P2], fs: [{ id: "f1", refV: "v1" }] });
  });

  it("ne compte pas les promotions d'une autre mention", () => {
    expect(usageDeLaVersion("d2", "v2", PROMOTIONS, [], suivie)).toEqual({ ps: [P3], fs: [] });
    expect(usageDeLaVersion("d2", "v1", PROMOTIONS, [], suivie)).toEqual({ ps: [], fs: [] });
  });

  it("ne trouve rien sans promotion ni évaluation", () => {
    expect(usageDeLaVersion("d1", "v1", [], [], suivie)).toEqual({ ps: [], fs: [] });
  });
});

describe("diplôme qui bloque une évaluation", () => {
  const valide = (diplome: string): boolean => diplome === "d1";
  const promotionValide = (promotion: Record<string, unknown>): boolean => promotion.id !== "p3";

  it("rend la mention de la première promotion au référentiel non validé", () => {
    expect(diplomeBloquant([P1, P3], "d1", valide, promotionValide)).toBe("d2");
  });

  it("ne bloque pas quand toutes les promotions sont validées", () => {
    expect(diplomeBloquant([P1, P2], "d1", valide, promotionValide)).toBe("");
  });

  it("sans promotion, regarde le diplôme affiché", () => {
    expect(diplomeBloquant([], "d1", valide, promotionValide)).toBe("");
    expect(diplomeBloquant([], "d2", valide, promotionValide)).toBe("d2");
  });

  it("rend le diplôme affiché pour une promotion sans mention", () => {
    expect(diplomeBloquant([{ id: "p3" }], "d1", valide, promotionValide)).toBe("d1");
  });
});

describe("nombre d'étudiants", () => {
  it("compte une ligne non vide par étudiant", () => {
    expect(nombreEtudiants("Ana\r\n  \nBen\n")).toBe(2);
  });

  it("vaut zéro pour une liste vide ou absente", () => {
    expect(nombreEtudiants("")).toBe(0);
    expect(nombreEtudiants(undefined)).toBe(0);
  });
});
