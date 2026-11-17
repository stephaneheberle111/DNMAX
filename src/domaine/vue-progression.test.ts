// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { blocsAffiches, lignesAffichees, ordreDansLeBloc, pourcentage, promotionsSuivies, semestresProgression } from "./vue-progression";

const promo = (id: string, changements: Partial<{ annee: number; duree: number; rangDiplome: number; debut: number; mienne: boolean }> = {}) => ({
  promotion: { id },
  annee: 2,
  duree: 3,
  rangDiplome: 0,
  debut: 2025,
  mienne: false,
  ...changements,
});

describe("promotionsSuivies", () => {
  it("montre les promotions en cours, par diplôme puis de la plus récente à la plus ancienne", () => {
    const resultat = promotionsSuivies([promo("a", { debut: 2024 }), promo("b", { debut: 2025 }), promo("c", { annee: 4 }), promo("d", { annee: 0 }), promo("e", { rangDiplome: -1 })], true);
    expect(resultat.promotions.map((p) => p.id)).toEqual(["e", "b", "a"]);
    expect(resultat.seulementMiennes).toBe(false);
  });

  it("avec « C'est moi », ne montre que mes promotions, terminées comprises", () => {
    const resultat = promotionsSuivies([promo("a", { mienne: true, annee: 5 }), promo("b")], true);
    expect(resultat).toEqual({ promotions: [{ id: "a" }], seulementMiennes: true, nombreMiennes: 1 });
  });

  it("revient aux promotions en cours quand je n'ai encore aucune affectation", () => {
    expect(promotionsSuivies([promo("a")], true).seulementMiennes).toBe(false);
    expect(promotionsSuivies([promo("a", { mienne: true })], false).seulementMiennes).toBe(false);
  });
});

describe("semestresProgression", () => {
  it("propose les semestres jusqu'à ceux de l'année en cours, et choisit celui du moment", () => {
    expect(semestresProgression(2, 3, 2)).toEqual({ semestres: ["S1", "S2", "S3", "S4"], courant: "S4" });
    expect(semestresProgression(1, 3, 1)).toEqual({ semestres: ["S1", "S2"], courant: "S1" });
  });

  it("prend le dernier semestre d'une promotion terminée", () => {
    expect(semestresProgression(4, 3, 1)).toEqual({ semestres: ["S1", "S2", "S3", "S4", "S5", "S6"], courant: "S6" });
  });
});

describe("lignes de la Progression", () => {
  const lignes = [
    { c: { bloc: "2" }, inSem: [1] },
    { c: { bloc: "10" }, inSem: [] },
    { c: { bloc: "2" }, inSem: [] },
  ];

  it("filtre les compétences à évaluer ou évaluées", () => {
    expect(lignesAffichees(lignes, "todo")).toHaveLength(2);
    expect(lignesAffichees(lignes, "fait")).toHaveLength(1);
    expect(lignesAffichees(lignes, "tout")).toHaveLength(3);
  });

  it("range les blocs par numéro, et dans un bloc les compétences à évaluer d'abord", () => {
    expect(blocsAffiches(lignes)).toEqual(["2", "10"]);
    expect(ordreDansLeBloc(lignes.filter((ligne) => ligne.c.bloc === "2")).map((ligne) => ligne.inSem.length)).toEqual([0, 1]);
  });

  it("arrondit le pourcentage, et rend zéro sans compétence", () => {
    expect(pourcentage(1, 3)).toBe(33);
    expect(pourcentage(0, 0)).toBe(0);
  });
});
