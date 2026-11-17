// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  blocsAffiches,
  ecartALaClasse,
  etatAnnee,
  fleche,
  lignesAffichees,
  ordreDansLeBloc,
  palier,
  pourcentage,
  promotionsSuivies,
  resumeAvancement,
  semestresProgression,
  tendance,
} from "./vue-progression";

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

describe("vue Étudiant", () => {
  it("résume ce qui reste en retard au semestre, ou rien", () => {
    expect(resumeAvancement({ part: 1, nr: 2, disp: 1, miss: 1, wait: 2 }, 7, "S3")).toEqual([
      { texte: "1 partielle", gras: false },
      { texte: "2 non rendus", gras: true },
      { texte: "1 dispensée", gras: false },
      { texte: "1 non évaluée alors que d'autres étudiants l'ont été", gras: true },
      { texte: "2 pas encore évaluées (pour personne)", gras: false },
    ]);
    expect(resumeAvancement({ part: 0, nr: 0, disp: 0, miss: 0, wait: 0 }, 3, "S3")).toEqual([{ texte: "Rien en retard.", gras: false }]);
    expect(resumeAvancement({ part: 0, nr: 0, disp: 0, miss: 0, wait: 0 }, 0, "S3")).toEqual([{ texte: "Aucune évaluation au S3 pour cet étudiant.", gras: false }]);
  });

  it("signale un écart d'au moins un demi-point à la moyenne de la classe, jamais pour les rendus", () => {
    expect(ecartALaClasse("nr", 2, 1, true)).toBe(" warn");
    expect(ecartALaClasse("nr", 0, 1, true)).toBe(" good");
    expect(ecartALaClasse("nr", 1.2, 1, true)).toBe("");
    expect(ecartALaClasse("rendu", 0, 5, false)).toBe("");
  });

  it("dit si l'étudiant progresse d'une évaluation à l'autre", () => {
    expect(tendance([1, 2])).toBe("en progrès sur 2 évaluations");
    expect(tendance([2, 1, 1])).toBe("en recul sur 3 évaluations");
    expect(tendance([2, 2])).toBe("stable sur 2 évaluations");
    expect(tendance([2])).toBe("1 évaluation");
    expect(fleche(1, 2)).toBe("↗");
    expect(fleche(2, 1)).toBe("↘");
    expect(fleche(2, 2)).toBe("→");
  });

  it("donne l'année du niveau d'acquisition atteint et l'état de chaque année", () => {
    const trajectoire = [
      { annee: 1, niveau: 2 },
      { annee: 2, niveau: 1 },
    ];
    expect(palier(trajectoire, 2)).toBe(1);
    expect(palier([{ annee: 1, niveau: 1 }], 2)).toBe(0);
    expect(etatAnnee(trajectoire, 1, 2, 2)).toEqual({ classe: " ok", texte: "atteint" });
    expect(etatAnnee(trajectoire, 2, 2, 2)).toEqual({ classe: " seen", texte: "évalué, maîtrise pas encore suffisante" });
    expect(etatAnnee(trajectoire, 3, 2, 2)).toEqual({ classe: " fut", texte: "année à venir" });
    expect(etatAnnee([], 2, 2, 2)).toEqual({ classe: "", texte: "pas encore évalué cette année" });
  });
});
