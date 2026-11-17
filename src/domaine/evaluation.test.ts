// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  anneeDeClasse,
  anneeScolaire,
  changerLivrableDeLigne,
  classesNettoyees,
  cleLigne,
  delier,
  detacher,
  formuler,
  ECHELLE,
  enumerer,
  estAcquis,
  ecsRetenus,
  etatEnregistrement,
  lignesDe,
  lireCalendrier,
  manquesPourEnregistrer,
  nettoyerRegroupements,
  normaliserEvaluation,
  rangSemestre,
  rattacher,
  reunir,
  semestresDeLAnnee,
  semestreSuggere,
} from "./evaluation";

const competence = (code: string, complement: object = {}): object => ({ code, op: "", libelle: "", livrables: [], ecs: [], coef: 1, ...complement });
const idFixe = (): string => "r9";

describe("normaliserEvaluation", () => {
  it("complète les listes absentes et garde les champs inconnus", () => {
    expect(normaliserEvaluation({ id: "e1", suivi: { x: 1 } })).toEqual({
      id: "e1",
      suivi: { x: 1 },
      ues: [],
      classes: [],
      classe: "",
      res: {},
      preset: "maitrise",
      niveaux: [...ECHELLE.niveaux],
    });
  });

  it("recalcule l'intitulé des classes, sans vide ni doublon", () => {
    expect(normaliserEvaluation({ classes: [" DN2-A", "", "DN2-A", "DN2-B"] })).toMatchObject({ classes: ["DN2-A", "DN2-B"], classe: "DN2-A, DN2-B" });
  });

  it("remplace des résultats illisibles par un objet vide, et accepte une valeur qui n'est pas un objet", () => {
    expect(normaliserEvaluation({ res: "abîmé" }).res).toEqual({});
    expect(normaliserEvaluation(null)).toMatchObject({ ues: [], classes: [], classe: "", res: {} });
  });

  it("ramène toute évaluation à l'échelle unique des niveaux de maîtrise", () => {
    expect(normaliserEvaluation({ preset: "note", niveaux: ["Note / 20"] })).toMatchObject({
      preset: "maitrise",
      niveaux: ["Insuffisant", "Fragile", "Satisfaisant", "Très bonne maîtrise"],
    });
  });
});

describe("estAcquis", () => {
  it("vaut acquis à partir de « Satisfaisant », pas en dessous", () => {
    expect(estAcquis(2)).toBe(true);
    expect(estAcquis(3)).toBe(true);
    expect(estAcquis(1)).toBe(false);
  });
});

describe("classesNettoyees", () => {
  it("rend une liste vide et un intitulé vide pour aucune classe", () => {
    expect(classesNettoyees([])).toEqual({ classes: [], classe: "" });
  });
});

describe("lignesDe et cleLigne", () => {
  const evaluation = {
    ops: [{ id: "r1", libelle: "Présenter", livrables: [] }, { id: "r2", libelle: "", livrables: [] }],
    items: [competence("C1", { op: "r1" }), competence("C2"), competence("C3", { op: "r1" })],
  };

  it("met les regroupements d'abord, puis les compétences seules", () => {
    const lignes = lignesDe(evaluation);
    expect(lignes.map(cleLigne)).toEqual(["op:r1", "one:C2"]);
  });

  it("ignore un regroupement sans compétence", () => {
    expect(lignesDe(evaluation).some((ligne) => ligne.regroupement?.id === "r2")).toBe(false);
  });

  it("rend une grille vide pour une évaluation illisible", () => {
    expect(lignesDe(undefined)).toEqual([]);
  });
});

describe("ecsRetenus", () => {
  it("garde les EC de la compétence que l'évaluation retient", () => {
    expect(ecsRetenus(["EC 1.1", "EC 1.2"], ["EC 1.2", "EC 9.9"])).toEqual(["EC 1.2"]);
  });

  it("prend tous les EC de la compétence si l'évaluation n'en retient aucun des siens", () => {
    expect(ecsRetenus(["EC 1.1", "EC 1.2"], ["EC 9.9"])).toEqual(["EC 1.1", "EC 1.2"]);
  });
});

describe("calendrier", () => {
  it("fait commencer l'année scolaire en septembre", () => {
    expect(anneeScolaire(new Date(2026, 8, 1))).toBe("2026-2027");
    expect(anneeScolaire(new Date(2027, 7, 31))).toBe("2026-2027");
  });

  it("met janvier au premier semestre et février au second", () => {
    expect(rangSemestre(new Date(2027, 0, 31))).toBe(1);
    expect(rangSemestre(new Date(2027, 1, 1))).toBe(2);
  });

  it("suggère le semestre de l'année du diplôme selon la date", () => {
    expect(semestresDeLAnnee(2)).toEqual(["S3", "S4"]);
    expect(semestreSuggere(2, new Date(2026, 10, 16))).toBe("S3");
    expect(semestreSuggere(3, new Date(2027, 3, 1))).toBe("S6");
  });

  it("suit le calendrier de l'établissement : rentrée en août, bascule fin janvier", () => {
    const calendrier = { rentree: 8, bascule: 1 };
    expect(anneeScolaire(new Date(2026, 7, 20), calendrier)).toBe("2026-2027");
    expect(rangSemestre(new Date(2027, 0, 5), calendrier)).toBe(2);
    expect(rangSemestre(new Date(2026, 11, 15), calendrier)).toBe(1);
  });

  it("lit le calendrier de l'établissement, avec septembre et février à défaut", () => {
    expect(lireCalendrier({ moisRentree: 8, moisBascule: "3" })).toEqual({ rentree: 8, bascule: 3 });
    expect(lireCalendrier({ moisRentree: 13, moisBascule: 0 })).toEqual({ rentree: 9, bascule: 2 });
    expect(lireCalendrier(undefined)).toEqual({ rentree: 9, bascule: 2 });
  });

  it("ne suggère rien sans année connue", () => {
    expect(semestreSuggere(0, new Date(2026, 10, 16))).toBe("");
  });
});

describe("anneeDeClasse", () => {
  it("lit le chiffre final après un tiret, puis un chiffre isolé", () => {
    expect(anneeDeClasse("DNO-2026-2")).toBe(2);
    expect(anneeDeClasse("DN MADE 3 Objet")).toBe(3);
  });

  it("rend 0 sans chiffre d'année reconnaissable", () => {
    expect(anneeDeClasse("Groupe 12")).toBe(0);
    expect(anneeDeClasse(undefined)).toBe(0);
  });
});

describe("nettoyerRegroupements", () => {
  it("défait un regroupement réduit à une compétence, qui reprend livrables et formulation", () => {
    const resultat = nettoyerRegroupements({
      ops: [{ id: "r1", libelle: "Présenter", livrables: ["Oral"] }],
      items: [competence("C1", { op: "r1", livrables: ["Carnet"] }), competence("C2")],
    });
    expect(resultat.ops).toEqual([]);
    expect(resultat.items[0]).toMatchObject({ op: "", libelle: "Présenter", livrables: ["Carnet", "Oral"] });
  });

  it("garde la formulation propre de la compétence restante", () => {
    const resultat = nettoyerRegroupements({
      ops: [{ id: "r1", libelle: "Présenter", livrables: [] }],
      items: [competence("C1", { op: "r1", libelle: "Exposer" })],
    });
    expect(resultat.items[0]?.libelle).toBe("Exposer");
  });

  it("garde un regroupement de deux compétences et retire celui qui n'en a plus", () => {
    const resultat = nettoyerRegroupements({
      ops: [{ id: "r1", libelle: "", livrables: [] }, { id: "r2", libelle: "", livrables: [] }],
      items: [competence("C1", { op: "r1" }), competence("C2", { op: "r1" })],
    });
    expect(resultat.ops.map((op) => op.id)).toEqual(["r1"]);
  });
});

describe("rattacher", () => {
  it("réunit deux compétences seules dans un nouveau regroupement, avec leurs livrables", () => {
    const resultat = rattacher(
      { ops: [], items: [competence("C1", { libelle: "Exposer", livrables: ["Oral"] }), competence("C2", { livrables: ["Carnet"] })] },
      "one:C1",
      "C2",
      idFixe,
    );
    expect(resultat.ops).toEqual([{ id: "r9", libelle: "Exposer", livrables: ["Oral", "Carnet"] }]);
    expect(resultat.items.map((item) => item.op)).toEqual(["r9", "r9"]);
  });

  it("fait rejoindre un regroupement existant, qui gagne les livrables de la compétence", () => {
    const resultat = rattacher(
      {
        ops: [{ id: "r1", libelle: "", livrables: ["Oral"] }],
        items: [competence("C1", { op: "r1" }), competence("C2", { op: "r1" }), competence("C3", { livrables: ["Carnet", "Oral"] })],
      },
      "op:r1",
      "C3",
      idFixe,
    );
    expect(resultat.ops[0]?.livrables).toEqual(["Oral", "Carnet"]);
    expect(resultat.items[2]?.op).toBe("r1");
  });

  it("défait le regroupement quitté s'il ne compte plus qu'une compétence", () => {
    const resultat = rattacher(
      {
        ops: [{ id: "r1", libelle: "", livrables: [] }],
        items: [competence("C1", { op: "r1" }), competence("C2", { op: "r1" }), competence("C3")],
      },
      "one:C3",
      "C2",
      idFixe,
    );
    expect(resultat.ops.map((op) => op.id)).toEqual(["r9"]);
    expect(resultat.items[0]?.op).toBe("");
  });

  it("ne fait rien pour une compétence déposée sur elle-même ou inconnue", () => {
    const evaluation = { ops: [], items: [competence("C1")] };
    expect(rattacher(evaluation, "one:C1", "C1", idFixe).ops).toEqual([]);
    expect(rattacher(evaluation, "one:C1", "C7", idFixe).ops).toEqual([]);
  });
});

describe("detacher", () => {
  it("sort une compétence de son regroupement, avec les livrables du regroupement", () => {
    const resultat = detacher(
      {
        ops: [{ id: "r1", libelle: "", livrables: ["Oral"] }],
        items: [competence("C1", { op: "r1" }), competence("C2", { op: "r1" }), competence("C3", { op: "r1" })],
      },
      "C3",
    );
    expect(resultat.items[2]).toMatchObject({ op: "", livrables: ["Oral"] });
    expect(resultat.ops).toHaveLength(1);
  });

  it("ne fait rien pour une compétence déjà seule", () => {
    const evaluation = { ops: [], items: [competence("C1")] };
    expect(detacher(evaluation, "C1").items[0]?.op).toBe("");
  });
});

describe("reunir", () => {
  it("crée un regroupement pour des compétences seules, formulé par la première qui l'est", () => {
    const resultat = reunir(
      { ops: [], items: [competence("C1"), competence("C2", { libelle: "Exposer", livrables: ["Oral"] })] },
      ["one:C1", "one:C2"],
      idFixe,
    );
    expect(resultat.regroupement).toBe("r9");
    expect(resultat.ops).toEqual([{ id: "r9", libelle: "Exposer", livrables: ["Oral"] }]);
  });

  it("fait accueillir par le premier regroupement les compétences des autres", () => {
    const resultat = reunir(
      {
        ops: [{ id: "r1", libelle: "A", livrables: [] }, { id: "r2", libelle: "B", livrables: [] }],
        items: [competence("C1", { op: "r1" }), competence("C2", { op: "r1" }), competence("C3", { op: "r2" }), competence("C4", { op: "r2" })],
      },
      ["op:r1", "op:r2"],
      idFixe,
    );
    expect(resultat.ops.map((op) => op.id)).toEqual(["r1"]);
    expect(resultat.items.every((item) => item.op === "r1")).toBe(true);
  });

  it("ne réunit rien avec une seule ligne sélectionnée", () => {
    expect(reunir({ ops: [], items: [competence("C1")] }, ["one:C1"], idFixe).regroupement).toBe("");
  });
});

describe("changerLivrableDeLigne", () => {
  const evaluation = {
    livrables: ["Oral", "Carnet"],
    ops: [{ id: "r1", libelle: "", livrables: [] }],
    items: [competence("C1", { op: "r1" }), competence("C2", { op: "r1" }), competence("C3", { livrables: ["Oral"] })],
  };

  it("ajoute un livrable attendu à une ligne, sans doublon", () => {
    expect(changerLivrableDeLigne(evaluation, "op:r1", "Carnet", true).ops[0]?.livrables).toEqual(["Carnet"]);
    expect(changerLivrableDeLigne(evaluation, "one:C3", "Oral", true).items[2]?.livrables).toEqual(["Oral"]);
  });

  it("refuse un livrable que l'évaluation n'attend pas", () => {
    expect(changerLivrableDeLigne(evaluation, "one:C3", "Maquette", true).items[2]?.livrables).toEqual(["Oral"]);
  });

  it("retire un livrable d'une ligne", () => {
    expect(changerLivrableDeLigne(evaluation, "one:C3", "Oral", false).items[2]?.livrables).toEqual([]);
  });
});

describe("manquesPourEnregistrer", () => {
  const complete = { titre: "Projet", classes: ["DN2"], consignes: "Rendre le carnet", ecCodes: ["EC 1.1"], ues: [], items: [competence("C1")] };

  it("demande intitulé, promotion, consigne, EC et compétence à une évaluation vide", () => {
    expect(manquesPourEnregistrer({ titre: "  ", items: [] })).toEqual([
      "un intitulé",
      "une promotion",
      "une consigne",
      "au moins un EC",
      "au moins une compétence",
    ]);
  });

  it("ne demande rien à une évaluation complète", () => {
    expect(manquesPourEnregistrer(complete)).toEqual([]);
  });

  it("accepte une UE retenue à la place d'un EC, et une promotion liée par son identifiant", () => {
    expect(manquesPourEnregistrer({ ...complete, ecCodes: [], ues: ["UE 1"] })).toEqual([]);
    expect(manquesPourEnregistrer({ ...complete, classes: [], promoId: "p1" })).toEqual([]);
  });

  it("refuse une consigne faite d'espaces", () => {
    expect(manquesPourEnregistrer({ ...complete, consignes: "   " })).toEqual(["une consigne"]);
  });
});

describe("enumerer", () => {
  it("relie les éléments par des virgules et un « et » final", () => {
    expect(enumerer(["a"])).toBe("a");
    expect(enumerer(["a", "b", "c"])).toBe("a, b et c");
    expect(enumerer([])).toBe("");
  });
});

describe("etatEnregistrement", () => {
  it("dit « liste » pour une évaluation de la liste, « bloquee » si son référentiel l'empêche", () => {
    expect(etatEnregistrement({ dansLaListe: true, commencee: true, referentielBloquant: false })).toBe("liste");
    expect(etatEnregistrement({ dansLaListe: true, commencee: true, referentielBloquant: true })).toBe("bloquee");
  });

  it("dit « vide » pour une évaluation pas encore commencée, même avec un référentiel bloquant", () => {
    expect(etatEnregistrement({ dansLaListe: false, commencee: false, referentielBloquant: true })).toBe("vide");
    expect(etatEnregistrement({ dansLaListe: false, commencee: true, referentielBloquant: true })).toBe("bloquee");
  });
});

describe("delier", () => {
  const evaluation = {
    items: [
      { code: "C1.1", op: "g", libelle: "", livrables: ["Carnet"] },
      { code: "C2.1", op: "g", libelle: "", livrables: [] },
      { code: "C3.1", op: "", libelle: "", livrables: [] },
    ],
    ops: [{ id: "g", libelle: "Construire un corpus", livrables: ["Maquette"] }],
  };

  it("défait le regroupement : chaque compétence emporte ses livrables et ceux du regroupement", () => {
    const { items, ops } = delier(evaluation, "g");
    expect(ops).toEqual([]);
    expect(items.map((competence) => [competence.code, competence.op, competence.livrables])).toEqual([
      ["C1.1", "", ["Carnet", "Maquette"]],
      ["C2.1", "", ["Maquette"]],
      ["C3.1", "", []],
    ]);
  });

  it("ne touche à rien pour un regroupement inconnu", () => {
    const { items, ops } = delier(evaluation, "absent");
    expect(ops).toHaveLength(1);
    expect(items.filter((competence) => competence.op === "g")).toHaveLength(2);
  });
});

describe("formuler", () => {
  const evaluation = {
    items: [
      { code: "C1.1", op: "g", libelle: "", livrables: [] },
      { code: "C2.1", op: "g", libelle: "", livrables: [] },
      { code: "C3.1", op: "", libelle: "", livrables: [] },
    ],
    ops: [{ id: "g", libelle: "", livrables: [] }],
  };

  it("écrit la formulation d'un regroupement", () => {
    expect(formuler(evaluation, "op:g", "Construire un corpus").ops[0]?.libelle).toBe("Construire un corpus");
  });

  it("écrit la formulation d'une compétence seule, sans toucher aux autres", () => {
    const { items } = formuler(evaluation, "one:C3.1", "Présenter le principe");
    expect(items.map((competence) => competence.libelle)).toEqual(["", "", "Présenter le principe"]);
  });

  it("garde le texte tel que saisi, espaces compris", () => {
    expect(formuler(evaluation, "one:C3.1", "  en cours ").items[2]?.libelle).toBe("  en cours ");
  });
});
