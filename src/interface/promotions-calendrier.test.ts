// SPDX-License-Identifier: CECILL-2.1
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { etat, etatVide } from "./etat";

vi.mock("./evaluation-courante", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./evaluation-courante")>()),
  setSemestre: (semestre: string) => {
    etat.evaluation.semestre = semestre;
  },
}));
import {
  anneeDeFormation,
  anneeDeLEvaluation,
  caleSemestreSurLaDate,
  dateDeReference,
  debutAnneeScolaire,
  dureeDiplome,
  nomAffiche,
  nomAutomatique,
  nomCourt,
  normaliserPromotion,
  promotionALAnnee,
  promotionsAffichees,
  brancherPromotionsCalendrier,
} from "./promotions-calendrier";

function preparer(): void {
  Object.assign(etat, etatVide());
  etat.donnees = {
    activeDiplome: "d1",
    diplomes: [
      { id: "d1", nom: "DN MADE", mention: "Objet", code: "DNO" },
      { id: "d2", nom: "DN MADE", mention: "Espace", code: "DNE", duree: 2 },
    ],
  };
}

beforeEach(() => {
  preparer();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-18T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("année scolaire et durée", () => {
  it("lit la première année d'une année scolaire", () => {
    expect(debutAnneeScolaire("2025-2026")).toBe(2025);
  });

  it("rend null sans année lisible", () => {
    expect(debutAnneeScolaire("")).toBeNull();
  });

  it("prend trois ans pour un diplôme sans durée ou inconnu", () => {
    expect(dureeDiplome("d1")).toBe(3);
    expect(dureeDiplome("inconnu")).toBe(3);
    expect(dureeDiplome("d2")).toBe(2);
  });
});

describe("promotions", () => {
  it("compose le nom : code du diplôme, entrée, sortie", () => {
    expect(nomAutomatique({ diplomeId: "d2", debut: 2025 })).toBe("DNE-2025-2027");
  });

  it("rattache au diplôme actif une promotion au diplôme inconnu, et la nomme", () => {
    const promotion = normaliserPromotion({ debut: "2026", diplomeId: "x", eleves: "" });
    expect(promotion).toMatchObject({ debut: 2026, diplomeId: "d1", nom: "DNO-2026-2029" });
    expect(Array.isArray(promotion.liste)).toBe(true);
  });

  it("donne l'année de formation à une année scolaire, au-delà de la durée comprise", () => {
    expect(anneeDeFormation({ diplomeId: "d1", debut: 2024, liste: [] }, "2026-2027")).toBe(3);
    expect(anneeDeFormation({ diplomeId: "d1", debut: 2020, liste: [] }, "2026-2027")).toBe(7);
  });

  it("borne l'année de la promotion à la durée du diplôme", () => {
    expect(promotionALAnnee({ diplomeId: "d1", debut: 2020, liste: [] }, "2026-2027")).toMatchObject({ annee: 3, as: "2026-2027" });
  });

  it("nomme court une promotion en cours, pas une promotion sortie", () => {
    expect(nomCourt({ diplomeId: "d1", debut: 2025, liste: [] })).toBe("DNO2");
    expect(nomCourt({ diplomeId: "d2", debut: 2026, liste: [] })).toBe("DNE1");
    expect(nomCourt({ diplomeId: "d1", debut: 2020, liste: [] })).toBe("");
  });

  it("affiche une promotion connue par son nom court, une inconnue telle quelle", () => {
    etat.promotions = [{ id: "p1", diplomeId: "d1", debut: 2025, liste: [] }];
    normaliserPromotion(etat.promotions[0] ?? {});
    expect(nomAffiche("DNO-2025-2028")).toBe("DNO2");
    expect(promotionsAffichees({ classe: "DNO-2025-2028, Autre" })).toBe("DNO2, Autre");
  });
});

describe("évaluation en cours", () => {
  it("date l'évaluation par sa distribution prévue, à défaut maintenant", () => {
    etat.evaluation = { distribPrev: "2027-02-10" };
    expect(dateDeReference().toISOString().slice(0, 10)).toBe("2027-02-10");
    etat.evaluation = { date: "pas une date" };
    expect(dateDeReference().toISOString().slice(0, 10)).toBe("2026-11-18");
  });

  it("prend l'année de formation de la promotion de l'évaluation", () => {
    etat.promotions = [{ id: "p1", diplomeId: "d1", debut: 2025, liste: [] }];
    etat.evaluation = { promoId: "p1", date: "2026-11-18" };
    expect(anneeDeLEvaluation()).toBe(2);
  });

  it("rend 0 quand les classes de l'évaluation sont de deux années différentes", () => {
    etat.promotions = [
      { id: "p1", nom: "A", diplomeId: "d1", debut: 2025, liste: [] },
      { id: "p2", nom: "B", diplomeId: "d1", debut: 2026, liste: [] },
    ];
    etat.evaluation = { classes: ["DNO-2025-2028", "DNO-2026-2029"], date: "2026-11-18" };
    expect(anneeDeLEvaluation()).toBe(0);
  });

  it("cale le semestre sur la date, sauf s'il a été choisi à la main", () => {
    brancherPromotionsCalendrier(() => undefined);
    etat.promotions = [{ id: "p1", diplomeId: "d1", debut: 2025, liste: [] }];
    etat.evaluation = { promoId: "p1", distribPrev: "2027-03-01", semestre: "S3" };
    expect(caleSemestreSurLaDate()).toBe(true);
    expect(etat.evaluation.semestre).toBe("S4");
    etat.evaluation = { promoId: "p1", distribPrev: "2027-03-01", semestre: "S3", semManuel: true };
    expect(caleSemestreSurLaDate()).toBe(false);
  });
});
