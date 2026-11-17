// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  ENSEIGNANTS_EXEMPLE,
  enseignantsDeLEc,
  estNomExemple,
  evaluationLecture,
  evaluationMobilier,
  evaluationSoutenance,
  evaluationsDuSemestre,
  melanger,
  nomsDePromotion,
  resultatsDetailles,
  semestresOuverts,
  suiteDetaillee,
  suiteEtendue,
  tirer,
  type ContexteDetaille,
  type SemestreExemple,
} from "./exemple";

const NIVEAUX = ["Insuffisant", "Fragile", "Satisfaisant", "Très bon"];

function contexteDetaille(codes: readonly string[]): ContexteDetaille {
  let compteur = 0;
  return {
    competence: (code) => (codes.includes(code) ? { code, ecs: [{ sem: "S1", ec: "EC 1.1" }, { sem: "S3", ec: "EC 3.1" }] } : undefined),
    ecsRetenus: (_competence, semestre) => [`EC ${semestre}`],
    nouvelIdentifiant: () => `id${String(++compteur)}`,
    maintenant: Date.UTC(2026, 10, 17, 10),
    niveaux: NIVEAUX,
  };
}

function semestre(maintenant: number, rang: number, debut: number): SemestreExemple {
  let compteur = 0;
  return {
    hasard: suiteEtendue(20251),
    rang,
    semestre: `S${String(rang + 1)}`,
    competences: ["C1.1", "C1.2", "C2.1", "C2.2", "C3.1", "C4.1", "C4.2"].map((code) => ({ code })),
    ecsRetenus: () => ["EC 1.1"],
    livrables: ["Carnet de projet"],
    theme: "le mobilier",
    promotion: { id: "p1", nom: "DN MADE 1 Objet" },
    debut,
    etudiants: ["e1", "e2", "e3"],
    maintenant,
    nouvelIdentifiant: () => `f${String(++compteur)}`,
    preset: "maitrise",
    niveaux: NIVEAUX,
  };
}

describe("suites pseudo-aléatoires", () => {
  it("rendent toujours la même suite pour une même graine", () => {
    const premiere = suiteEtendue(20251);
    const seconde = suiteEtendue(20251);
    expect([premiere(), premiere(), premiere()]).toEqual([seconde(), seconde(), seconde()]);
  });

  it("restent dans [0, 1[", () => {
    const hasard = suiteDetaillee(11);
    for (let rang = 0; rang < 1000; rang++) {
      const valeur = hasard();
      expect(valeur).toBeGreaterThanOrEqual(0);
      expect(valeur).toBeLessThan(1);
    }
  });

  it("prennent 7 comme graine quand on n'en donne aucune", () => {
    const sans = suiteDetaillee(0);
    const avec = suiteDetaillee(7);
    expect(sans()).toBe(avec());
  });
});

describe("tirer et melanger", () => {
  it("tire un élément de la liste", () => {
    expect(["a", "b", "c"]).toContain(tirer(suiteEtendue(3), ["a", "b", "c"]));
  });

  it("mélange sans perdre ni dupliquer d'élément, sans toucher à l'original", () => {
    const liste = [1, 2, 3, 4, 5, 6];
    const melange = melanger(suiteEtendue(5), liste);
    expect([...melange].sort()).toEqual(liste);
    expect(liste).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("mélange une liste vide en liste vide", () => {
    expect(melanger(suiteEtendue(5), [])).toEqual([]);
  });
});

describe("estNomExemple", () => {
  it("reconnaît un nom tiré de ses listes, nom composé compris", () => {
    expect(estNomExemple("Zoé Da Silva")).toBe(true);
  });

  it("ne reconnaît pas un nom saisi par l'enseignant", () => {
    expect(estNomExemple("Jeanne Dupont")).toBe(false);
    expect(estNomExemple("")).toBe(false);
  });
});

describe("nomsDePromotion", () => {
  it("tire 12 à 16 noms distincts pour une promotion vide", () => {
    const noms = nomsDePromotion(suiteEtendue(20251), 0);
    expect(noms.length).toBeGreaterThanOrEqual(12);
    expect(noms.length).toBeLessThanOrEqual(16);
    expect(new Set(noms).size).toBe(noms.length);
    expect(noms.every(estNomExemple)).toBe(true);
  });

  it("tire autant de noms que d'étudiants déjà là", () => {
    expect(nomsDePromotion(suiteEtendue(20251), 5)).toHaveLength(5);
  });
});

describe("enseignantsDeLEc", () => {
  it("rend un ou deux enseignants de la liste", () => {
    const hasard = suiteEtendue(20251);
    for (let rang = 0; rang < 30; rang++) {
      const choisis = enseignantsDeLEc(hasard, rang, ["t1", "t2", "t3"]);
      expect(choisis.length === 1 || choisis.length === 2).toBe(true);
      expect(choisis.every((id) => ["t1", "t2", "t3"].includes(id))).toBe(true);
    }
  });
});

describe("semestresOuverts", () => {
  it("compte deux semestres par année écoulée plus ceux de l'année en cours", () => {
    expect(semestresOuverts(1, 3, 2)).toBe(4);
  });

  it("ouvre tous les semestres d'une promotion sortie", () => {
    expect(semestresOuverts(3, 3, 1)).toBe(6);
  });

  it("n'ouvre rien à la rentrée pour une promotion qui entre, avant le premier semestre", () => {
    expect(semestresOuverts(0, 3, 0)).toBe(0);
  });
});

describe("resultatsDetailles", () => {
  const etudiants = ["e1", "e2", "e3", "e4", "e5", "e6"];
  const cles = ["a", "b", "c", "d"];

  it("donne à chaque étudiant un niveau par ligne, dans l'échelle", () => {
    const resultats = resultatsDetailles(etudiants, cles, 4, 29, 0);
    expect(Object.keys(resultats)).toEqual(etudiants);
    for (const resultat of Object.values(resultats)) {
      expect(Object.keys(resultat.n)).toEqual(cles);
      expect(Object.values(resultat.n).every((niveau) => niveau >= 0 && niveau <= 3)).toBe(true);
    }
  });

  it("laisse un étudiant sur deux de fin de liste non commencé, les autres à moitié saisis", () => {
    const resultats = resultatsDetailles(etudiants, cles, 4, 11, 3);
    expect(resultats.e6).toBeUndefined();
    expect(resultats.e4).toBeUndefined();
    expect(Object.keys(resultats.e5?.n ?? {})).toEqual(["a", "b"]);
    expect(resultats.e5?.appr).toBe("");
    expect(Object.keys(resultats.e3?.n ?? {})).toEqual(cles);
  });

  it("rend des résultats identiques pour une même graine", () => {
    expect(resultatsDetailles(etudiants, cles, 4, 47, 2)).toEqual(resultatsDetailles(etudiants, cles, 4, 47, 2));
  });
});

describe("évaluations détaillées", () => {
  it("regroupe les lignes du mobilier par opération", () => {
    const evaluation = evaluationMobilier(contexteDetaille(["C4.1", "C4.3", "C10.3", "C11.2", "C10.6", "C2.1"]));
    const [corpus, assemblages] = evaluation.ops as { id: string }[];
    expect(evaluation.items.map((item) => item.op)).toEqual([corpus?.id, corpus?.id, assemblages?.id, assemblages?.id, "", ""]);
    expect(evaluation.items[0]?.ecs).toEqual(["EC S3"]);
    expect(evaluation.date).toBe("2026-11-17");
  });

  it("omet les compétences absentes du référentiel", () => {
    expect(evaluationSoutenance(contexteDetaille(["C2.2"])).items.map((item) => item.code)).toEqual(["C2.2"]);
  });

  it("date la fiche de lecture de trois semaines et garde les EC du S1", () => {
    const evaluation = evaluationLecture(contexteDetaille(["C4.2"]));
    expect(evaluation.date).toBe("2026-10-27");
    expect(evaluation.items[0]?.ecs).toEqual(["EC 1.1"]);
  });
});

describe("evaluationsDuSemestre", () => {
  it("génère deux ou trois évaluations d'un semestre écoulé, avec résultats et restitution", () => {
    const evaluations = evaluationsDuSemestre(semestre(Date.UTC(2026, 10, 17), 0, 2024));
    expect(evaluations.length === 2 || evaluations.length === 3).toBe(true);
    const saisies = evaluations.filter((evaluation) => Object.keys(evaluation.res as object).length > 0);
    expect(saisies.length).toBeGreaterThan(0);
    for (const evaluation of saisies) expect(Object.keys(evaluation.restit as object)).toEqual(["DN MADE 1 Objet"]);
    expect(evaluations.every((evaluation) => ENSEIGNANTS_EXEMPLE.includes(evaluation.prof as string))).toBe(true);
    expect(evaluations[0]?.titre).toMatch(/ — le mobilier \(S1\)$/);
  });

  it("ne génère rien pour un semestre qui commence dans plus de quarante jours", () => {
    expect(evaluationsDuSemestre(semestre(Date.UTC(2026, 6, 1), 0, 2026))).toEqual([]);
  });

  it("ne saisit ni ne restitue une évaluation à venir", () => {
    const evaluations = evaluationsDuSemestre(semestre(Date.UTC(2026, 10, 1), 0, 2026));
    const avenir = evaluations.filter((evaluation) => Date.parse(evaluation.date as string) > Date.UTC(2026, 10, 1));
    expect(avenir.length).toBeGreaterThan(0);
    for (const evaluation of avenir) {
      expect(evaluation.res).toEqual({});
      expect(evaluation.restit).toEqual({});
    }
  });
});
