// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  autresEvaluationsDesPromotions,
  autresPromotionsMontrees,
  basculerEc,
  basculerUe,
  cadreDuSemestre,
  ecsAssures,
  estEnCours,
  etudiantsVises,
  promotionsAProposer,
  promotionsBloquees,
  rangEc,
  separerMiennes,
  uesRetenues,
} from "./cadre-evaluation";

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

describe("estEnCours", () => {
  it("vaut vrai pour une année de formation dans la durée du diplôme", () => {
    expect(estEnCours({ nom: "P", annee: 3, duree: 3, rangDiplome: 0 })).toBe(true);
  });

  it("vaut faux avant l'entrée et après la sortie", () => {
    expect(estEnCours({ nom: "P", annee: 0, duree: 3, rangDiplome: 0 })).toBe(false);
    expect(estEnCours({ nom: "P", annee: 4, duree: 3, rangDiplome: 0 })).toBe(false);
  });

  it("vaut faux pour une année illisible", () => {
    expect(estEnCours({ nom: "P", annee: Number.NaN, duree: 3, rangDiplome: 0 })).toBe(false);
  });
});

describe("promotionsAProposer", () => {
  it("range les promotions en cours par année, puis par diplôme", () => {
    const promotions = [
      { nom: "B2", annee: 2, duree: 3, rangDiplome: 1 },
      { nom: "A2", annee: 2, duree: 3, rangDiplome: 0 },
      { nom: "A1", annee: 1, duree: 3, rangDiplome: 0 },
    ];
    expect(promotionsAProposer(promotions, [])).toEqual({ noms: ["A1", "A2", "B2"], aucuneEnCours: false });
  });

  it("laisse de côté une promotion sortie, sauf si elle est cochée", () => {
    const promotions = [
      { nom: "Sortie", annee: 4, duree: 3, rangDiplome: 0 },
      { nom: "Autre", annee: 5, duree: 3, rangDiplome: 0 },
    ];
    expect(promotionsAProposer(promotions, ["Sortie"])).toEqual({ noms: ["Sortie"], aucuneEnCours: true });
  });

  it("ne répète pas une promotion cochée et en cours, et retire un nom vide", () => {
    expect(promotionsAProposer([{ nom: "A1", annee: 1, duree: 3, rangDiplome: 0 }], ["A1", ""]).noms).toEqual(["A1"]);
  });
});

describe("etudiantsVises", () => {
  it("garde les étudiants choisis encore présents", () => {
    expect(etudiantsVises({ eleveIds: ["e1", "parti", "e2"] }, ["e1", "e2"])).toEqual(["e1", "e2"]);
  });

  it("reprend l'étudiant unique d'une évaluation ancienne", () => {
    expect(etudiantsVises({ eleveId: "e1" }, ["e1"])).toEqual(["e1"]);
  });

  it("vise toute la promotion sans choix, ou si plus personne n'est présent", () => {
    expect(etudiantsVises({}, ["e1"])).toEqual([]);
    expect(etudiantsVises({ eleveIds: ["parti"] }, [])).toEqual([]);
  });
});

describe("ecsAssures", () => {
  const repartition = {
    affectations: { ec1: ["t1"], ec2: ["t2"] },
    ecs: [
      { id: "ec1", code: "EC 1.1" },
      { id: "ec2", code: "EC 1.2" },
      { id: "ec3", code: "EC 1.3" },
    ],
  };

  it("retient les EC assurés par l'un des enseignants choisis", () => {
    expect(ecsAssures(["t1"], [repartition])).toEqual(new Set(["EC 1.1"]));
  });

  it("ne restreint rien sans enseignant, sans promotion ou sans répartition", () => {
    expect(ecsAssures([], [repartition])).toBeNull();
    expect(ecsAssures(["t1"], [])).toBeNull();
    expect(ecsAssures(["t1"], [{ affectations: {}, ecs: repartition.ecs }])).toBeNull();
  });

  it("rend une liste vide quand l'enseignant n'assure aucun EC d'une promotion répartie", () => {
    expect(ecsAssures(["t9"], [repartition])).toEqual(new Set());
  });
});

describe("autresEvaluationsDesPromotions", () => {
  const promotions = [{ nom: "P1", id: "p1" }];

  it("retient les évaluations enregistrées de la promotion, par son nom ou son ancien lien", () => {
    const evaluations = [
      { id: "a", classes: ["P1"] },
      { id: "b", promoId: "p1" },
    ];
    expect(autresEvaluationsDesPromotions(evaluations, "x", promotions).map((evaluation) => evaluation.id)).toEqual(["a", "b"]);
  });

  it("écarte l'évaluation en cours, les brouillons et les autres promotions", () => {
    const evaluations = [
      { id: "x", classes: ["P1"] },
      { id: "b", classes: ["P1"], brouillon: true },
      { id: "c", classes: ["P2"] },
    ];
    expect(autresEvaluationsDesPromotions(evaluations, "x", promotions)).toEqual([]);
  });

  it("ne retient rien sans promotion cochée", () => {
    expect(autresEvaluationsDesPromotions([{ id: "a", classes: ["P1"] }], "x", [])).toEqual([]);
  });
});
