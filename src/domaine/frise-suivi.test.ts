// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { dateCourte, derniereDate, etatEtape, infobulleSuivi, pointsFrise, prochaineEtape } from "./frise-suivi";

describe("dateCourte", () => {
  it("écrit jour et mois, et rien pour une date absente", () => {
    expect(dateCourte("2026-11-07")).toBe("07/11");
    expect(dateCourte("")).toBe("");
    expect(dateCourte(undefined)).toBe("");
  });
});

describe("derniereDate", () => {
  it("rend la plus récente des dates connues", () => {
    expect(derniereDate(["2026-10-01", undefined, "2026-11-02", ""])).toBe("2026-11-02");
    expect(derniereDate([])).toBe("");
  });
});

describe("pointsFrise", () => {
  it("remplit les étapes franchies, et à moitié l'étape commencée", () => {
    expect(pointsFrise("evalcours")).toEqual([
      { classe: "done", allumee: false },
      { classe: "done", allumee: true },
      { classe: "done", allumee: true },
      { classe: "half cur", allumee: true },
      { classe: "", allumee: false },
    ]);
    expect(pointsFrise("rendu")[2]).toEqual({ classe: "done cur", allumee: true });
  });

  it("ne remplit rien pour une évaluation annulée", () => {
    expect(pointsFrise("annulee").every((point) => point.classe === "" && !point.allumee)).toBe(true);
  });
});

describe("etatEtape", () => {
  it("dit si une étape est franchie, commencée ou à venir", () => {
    expect(etatEtape(2, "evalcours")).toBe("étape franchie");
    expect(etatEtape(3, "evalcours")).toBe("étape commencée");
    expect(etatEtape(3, "eval")).toBe("étape franchie");
    expect(etatEtape(4, "evalcours")).toBe("à venir");
  });
});

describe("prochaineEtape", () => {
  const base = { moduleEleves: false, annulee: "", distribution: "", rendu: "", saisie: { full: 0, tot: 0 }, restitutions: { n: 0, tot: 0 }, derniereRestitution: "" };

  it("annonce la distribution, datée ou non", () => {
    expect(prochaineEtape("prep", { ...base, distribution: "2026-11-20" })).toBe("→ distribution prévue le 20/11");
    expect(prochaineEtape("prep", base)).toBe("→ à distribuer (date non fixée)");
  });

  it("compte les étudiants restant à saisir avec le module Étudiants", () => {
    expect(prochaineEtape("evalcours", { ...base, moduleEleves: true, saisie: { full: 3, tot: 5 } })).toBe("→ 2 étudiants à saisir (3/5)");
    expect(prochaineEtape("evalcours", base)).toBe("→ marquer terminée une fois évaluée");
  });

  it("compte les étudiants restant à qui restituer, ou la promotion restante", () => {
    expect(prochaineEtape("restpart", { ...base, restitutions: { n: 4, tot: 5 } })).toBe("→ à restituer à 1 étudiant");
    expect(prochaineEtape("restpart", base)).toBe("→ promotion restante à restituer");
  });

  it("date la fin d'une évaluation restituée et d'une évaluation annulée", () => {
    expect(prochaineEtape("restit", { ...base, derniereRestitution: "2026-12-01" })).toBe("✓ terminée le 01/12");
    expect(prochaineEtape("restit", base)).toBe("✓ terminée");
    expect(prochaineEtape("annulee", { ...base, annulee: "2026-10-05" })).toBe("annulée le 05/10");
  });
});

describe("infobulleSuivi", () => {
  it("résume les dates connues de l'évaluation", () => {
    expect(infobulleSuivi({ saisie: "2026-09-01", distribution: "2026-09-10", rendu: "", evaluee: "2026-10-01", restituee: "" })).toBe(
      "Saisie le 01/09 · distribution prévue le 10/09 · rendu non daté · terminée le 01/10",
    );
  });
});
