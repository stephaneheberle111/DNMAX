// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide, type Objet } from "./etat";
import { brancherDonnees } from "./donnees";
import {
  compsFor,
  ecsOfSem,
  evalStats,
  itemEcs,
  ligKey,
  ligTitre,
  lignesOf,
  migF,
  promoElevesOf,
  brancherEvaluationCourante,
  setClasses,
  setSemestre,
  studentsOf,
  syncListe,
  uid,
} from "./evaluation-courante";

function competence(code: string, ecs: Objet[]): Objet {
  return { code, libelle: "Libellé " + code, ecs };
}

beforeEach(() => {
  Object.assign(etat, etatVide());
  brancherDonnees({ ecrireStockage: () => undefined, maintenant: () => 0, hasard: () => 0.25 });
  brancherEvaluationCourante(() => 0.123456789);
  etat.referentiel = {
    competences: [
      competence("C1", [
        { sem: "S1", ec: "EC 2", nom: "Deux", ue: "UE1", couleur: "#111" },
        { sem: "S2", ec: "EC 5", nom: "Cinq", ue: "UE2", couleur: "#222" },
      ]),
      competence("C2", [{ sem: "S1", ec: "EC 1", nom: "Un", ue: "UE2", couleur: "#333" }]),
      competence("C3", []),
    ],
  };
});

describe("liste des étudiants d'une promotion", () => {
  it("garde l'identifiant d'un étudiant déjà présent et en donne un au nouveau", () => {
    const promotion: Objet = { liste: [{ id: "e1", nom: "Ada Lovelace", prenom: "Ada", nomFam: "Lovelace" }] };
    syncListe(promotion, "Ada Lovelace\nAlan Turing");
    const liste = promotion.liste as Objet[];
    expect(liste.map((etudiant) => etudiant.id)).toEqual(["e1", "s0" + (0.25).toString(36).slice(2, 5)]);
    expect(promotion.eleves).toBe("Ada Lovelace\nAlan Turing");
  });

  it("retire un étudiant absent du texte", () => {
    const promotion: Objet = { liste: [{ id: "e1", nom: "Ada Lovelace" }] };
    syncListe(promotion, "");
    expect(promotion.liste).toEqual([]);
    expect(promotion.eleves).toBe("");
  });

  it("recompose la liste sans texte, sans changer les identifiants", () => {
    const promotion: Objet = { liste: [{ id: "e1", nom: "Ada Lovelace" }] };
    syncListe(promotion);
    expect((promotion.liste as Objet[])[0]?.id).toBe("e1");
  });
});

describe("étudiants d'une évaluation", () => {
  beforeEach(() => {
    etat.promotions = [
      { id: "p1", nom: "DNO1", liste: [{ id: "e1", nom: "Ada Lovelace" }, { id: "e2", nom: "Alan Turing" }] },
      { id: "p2", nom: "DNO2", liste: [{ id: "e2", nom: "Alan Turing" }, { id: "e3", nom: "Grace Hopper" }] },
    ];
  });

  it("réunit les étudiants des promotions choisies, sans doublon", () => {
    expect(promoElevesOf({ classes: ["DNO1", "DNO2"] }).map((etudiant) => etudiant.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("se rabat sur l'ancienne promotion liée", () => {
    expect(promoElevesOf({ promoId: "p2" }).map((etudiant) => etudiant.id)).toEqual(["e2", "e3"]);
  });

  it("réduit aux étudiants visés quand l'un d'eux existe encore", () => {
    expect(studentsOf({ classes: ["DNO1"], eleveIds: ["e2", "absent"] })).toEqual([{ id: "e2", nom: "Alan Turing" }]);
  });

  it("garde toute la promotion quand aucun étudiant visé n'existe plus", () => {
    expect(studentsOf({ classes: ["DNO1"], eleveId: "absent" })).toHaveLength(2);
  });

  it("lit les noms saisis à la main sans promotion", () => {
    expect(studentsOf({ eleves: " Ada \n\nAlan\r\n" })).toEqual([
      { id: "libre0", nom: "Ada" },
      { id: "libre1", nom: "Alan" },
    ]);
  });

  it("prend l'évaluation en cours par défaut", () => {
    etat.evaluation = { classes: ["DNO2"] };
    expect(studentsOf().map((etudiant) => etudiant.id)).toEqual(["e2", "e3"]);
  });
});

describe("lignes de la grille", () => {
  const evaluation: Objet = {
    items: [{ code: "C1", op: "o1" }, { code: "C2", libelle: "Reformulée", op: "" }, { code: "C3", op: "o1" }],
    ops: [{ id: "o1", libelle: "" }],
  };

  it("rend les objets mêmes de l'évaluation, regroupements d'abord", () => {
    const lignes = lignesOf(evaluation);
    expect(lignes.map(ligKey)).toEqual(["op:o1", "one:C2"]);
    const [regroupement, seule] = lignes;
    expect(regroupement?.k === "op" && regroupement.o).toBe((evaluation.ops as Objet[])[0]);
    expect(regroupement?.k === "op" && regroupement.its).toEqual([(evaluation.items as Objet[])[0], (evaluation.items as Objet[])[2]]);
    expect(seule?.k === "one" && seule.it).toBe((evaluation.items as Objet[])[1]);
  });

  it("titre une compétence par son libellé propre, sinon celui du référentiel", () => {
    expect(ligTitre({ k: "one", it: { code: "C2", libelle: "Reformulée" } })).toEqual({ code: "C2", lib: "Reformulée", op: false });
    expect(ligTitre({ k: "one", it: { code: "C1" } }).lib).toBe("Libellé C1");
    expect(ligTitre({ k: "one", it: { code: "inconnue" } }).lib).toBe("");
  });

  it("titre un regroupement non formulé par une invite", () => {
    expect(ligTitre({ k: "op", o: { id: "o1" }, its: [{ code: "C1" }, { code: "C3" }] })).toEqual({
      code: "C1 + C3",
      lib: "(compétence opérationnelle à formuler)",
      op: true,
    });
  });

  it("compte étudiants et lignes avec le bilan de la saisie", () => {
    const bilan = evalStats({ eleves: "Ada", items: [{ code: "C1" }], ops: [], res: {} });
    expect(bilan.els).toBe(1);
    expect(bilan.lignes).toBe(1);
  });
});

describe("compétences et EC du semestre", () => {
  it("garde les compétences qui ont un EC au semestre", () => {
    expect(compsFor("S1").map((competence) => competence.code)).toEqual(["C1", "C2"]);
    expect(compsFor("S6")).toEqual([]);
  });

  it("liste les EC du semestre sans doublon, dans l'ordre de leur numéro", () => {
    expect(ecsOfSem("S1")).toEqual([
      { ec: "EC 1", nom: "Un", ue: "UE2", couleur: "#333" },
      { ec: "EC 2", nom: "Deux", ue: "UE1", couleur: "#111" },
    ]);
  });

  it("retient les EC d'une UE choisie", () => {
    etat.evaluation = { ecCodes: [], ues: ["UE1"] };
    expect(itemEcs((etat.referentiel.competences as Objet[])[0] as Objet, "S1")).toEqual(["EC 2"]);
  });

  it("recalcule les EC de chaque compétence en changeant de semestre", () => {
    etat.evaluation = { ecCodes: ["EC 5"], ues: [], items: [{ code: "C1" }, { code: "disparue" }] };
    setSemestre("S2");
    expect(etat.evaluation.semestre).toBe("S2");
    expect(etat.evaluation.items).toEqual([
      { code: "C1", ecs: ["EC 5"] },
      { code: "disparue", ecs: [] },
    ]);
  });
});

describe("évaluation en cours", () => {
  it("nettoie les promotions retenues", () => {
    etat.evaluation = {};
    setClasses(["DNO1", "", "DNO1"]);
    expect(etat.evaluation.classes).toEqual(["DNO1"]);
  });

  it("normalise une évaluation sur place", () => {
    const evaluation: Objet = { id: "f1" };
    expect(migF(evaluation)).toBe(evaluation);
    expect(evaluation.ues).toEqual([]);
    expect(evaluation.preset).toBe("maitrise");
  });

  it("tire un identifiant court", () => {
    expect(uid()).toBe((0.123456789).toString(36).slice(2, 9));
  });
});
