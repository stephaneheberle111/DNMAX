// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consigneEtudiants,
  contexteCompetences,
  ecsDeLUe,
  ecsDesEnseignants,
  evaluationVierge,
  nettoyerLesRegroupements,
  brancherEditeurEtape1,
  rangRegroupement,
  rendusManquants,
  uesChoisies,
} from "./editeur-etape1";
import { ECHELLE } from "../domaine/evaluation";
import { etat, etatVide, type Objet } from "./etat";
import { brancherEvaluationCourante } from "./evaluation-courante";

/** Doubles des fonctions des autres modules, remplaçables dans un test. */
const doubles = vi.hoisted(() => ({
  appels: [] as string[],
  ecsOfSem: (semestre: unknown): Record<string, unknown>[] => (semestre === "S1" ? ECS_S1 : []),
  semSuggere: (): string => {
    doubles.appels.push("semSuggere");
    return "S3";
  },
}));
const appels = doubles.appels;

const ECS_S1: Objet[] = vi.hoisted(() => [
  { ec: "EC 1.1", nom: "Un", ue: "UE 1", couleur: "#111" },
  { ec: "EC 1.2", nom: "Deux", ue: "UE 1", couleur: "" },
  { ec: "EC 2.1", nom: "Trois", ue: "UE 2", couleur: "#333" },
]);

vi.mock("./evaluation-courante", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./evaluation-courante")>()),
  ecsOfSem: (semestre: unknown) => doubles.ecsOfSem(semestre),
}));
vi.mock("./promotions-calendrier", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./promotions-calendrier")>()),
  semestrePropose: () => doubles.semSuggere(),
  anneeScolaire: () => {
    doubles.appels.push("anneeScolaire");
    return "2026-2027";
  },
  promotionsAffichees: () => "Promo 1",
}));
vi.mock("./etablissement", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./etablissement")>()),
  repartitionLue: (id: unknown) => {
    doubles.appels.push("affGet " + String(id));
    return id === "p1" ? { ec1: ["t1"] } : {};
  },
  ecsDeLaPromotion: () => [
    { id: "ec1", code: "EC 1.1" },
    { id: "ec2", code: "EC 1.2" },
  ],
}));
vi.mock("./aides-communes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./aides-communes")>()),
  blocName: (numero: unknown) => "Bloc " + String(numero),
}));
vi.mock("./evaluations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./evaluations")>()),
  statutDe: () => "eval",
  estEvalueeDonnee: () => true,
}));
vi.mock("./editeur", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./editeur")>()),
  enregistrer: () => doubles.appels.push("save"),
  peindreEtapes: () => doubles.appels.push("paintSteps"),
}));

const semSuggereDeDepart = doubles.semSuggere;

beforeEach(() => {
  Object.assign(etat, etatVide());
  appels.length = 0;
  doubles.semSuggere = semSuggereDeDepart;
  brancherEvaluationCourante(() => 0.5);
  brancherEditeurEtape1(() => new Date("2026-11-18T10:00:00Z"));
  etat.donnees = { diplomes: [{ id: "d1" }], activeDiplome: "d1", enseignants: [{ id: "t1", nom: "Ada" }], moi: "t1" };
  etat.ui = { q: "", step: 1 };
  etat.modules = { eleves: true };
  etat.referentiel = {
    competences: [
      { code: "C1", libelle: "Première", bloc: 1, ecs: [{ sem: "S1", ec: "EC 1.1", ue: "UE 1" }] },
      { code: "C2", libelle: "Deuxième", bloc: 2, ecs: [{ sem: "S1", ec: "EC 2.1", ue: "UE 2" }] },
    ],
  };
  etat.teinteBlocs = "#D1F1DA";
  etat.promotions = [{ id: "p1", nom: "P1", liste: [{ id: "e1", nom: "Ana" }, { id: "e2", nom: "Bob" }] }];
  etat.evaluation = { id: "f1", semestre: "S1", ues: [], ecCodes: [], classes: [], profs: [], ops: [], items: [], res: {} };
});

describe("évaluation vierge", () => {
  it("tire son identifiant, puis son semestre, et prend la date du jour", () => {
    const vierge = evaluationVierge();
    expect(vierge.id).toBe((0.5).toString(36).slice(2, 9));
    expect(vierge.semestre).toBe("S3");
    expect(vierge.date).toBe("2026-11-18");
    expect(vierge.niveaux).toEqual([...ECHELLE.niveaux]);
    expect(vierge.niveaux).not.toBe(ECHELLE.niveaux);
    expect(vierge.preset).toBe("maitrise");
    expect(appels).toEqual(["semSuggere"]);
  });

  it("prend le premier semestre quand aucun n'est suggéré", () => {
    doubles.semSuggere = () => "";
    expect(evaluationVierge().semestre).toBe("S1");
  });
});

describe("UE et EC de l'évaluation en cours", () => {
  it("donne les EC d'une UE au semestre de l'évaluation", () => {
    expect(ecsDeLUe("UE 1")).toEqual(["EC 1.1", "EC 1.2"]);
    expect(ecsDeLUe("UE 1", "S2")).toEqual([]);
  });

  it("ajoute aux UE cochées celles des EC cochés seuls, sans doublon", () => {
    etat.evaluation.ues = ["UE 1"];
    etat.evaluation.ecCodes = ["EC 1.2", "EC 2.1", "EC inconnu"];
    expect(uesChoisies()).toEqual(["UE 1", "UE 2"]);
  });
});

describe("EC des enseignants choisis", () => {
  it("ne restreint rien sans enseignant ou sans promotion, sans lire la répartition", () => {
    etat.evaluation.classes = ["P1"];
    expect(ecsDesEnseignants()).toBeNull();
    expect(appels).toEqual([]);
  });

  it("lit la répartition promotion par promotion et retient les EC assurés", () => {
    etat.evaluation.classes = ["P1"];
    etat.evaluation.profs = ["Ada"];
    expect(ecsDesEnseignants()).toEqual(new Set(["EC 1.1"]));
    expect(appels).toEqual(["affGet p1", "anneeScolaire"]);
  });
});

describe("aides de la grille", () => {
  it("numérote un regroupement à partir de 1, et 0 s'il est absent", () => {
    etat.evaluation.ops = [{ id: "o1" }, { id: "o2" }];
    expect(rangRegroupement("o2")).toBe(2);
    expect(rangRegroupement("x")).toBe(0);
  });

  it("retire un regroupement qui n'a plus de compétence", () => {
    etat.evaluation.items = [{ code: "C1", op: "" }];
    etat.evaluation.ops = [{ id: "o1", libelle: "Vide" }];
    nettoyerLesRegroupements();
    expect(etat.evaluation.ops).toEqual([]);
  });

  it("compte les rendus manquants avec le module Étudiants seulement", () => {
    const evaluation: Objet = { classes: ["P1"], res: { e1: { rendu: true } } };
    expect(rendusManquants(evaluation)).toBe(1);
    etat.modules = { eleves: false };
    expect(rendusManquants(evaluation)).toBe(0);
  });
});

describe("contexte des compétences", () => {
  it("propose les compétences du semestre, toutes hors du cadre sans EC choisi", () => {
    const contexte = contexteCompetences();
    expect(contexte.competences).toEqual([
      { code: "C1", libelle: "Première", bloc: "1", nomBloc: "Bloc 1", dansLeCadre: false },
      { code: "C2", libelle: "Deuxième", bloc: "2", nomBloc: "Bloc 2", dansLeCadre: false },
    ]);
    expect(contexte.cadre).toBeNull();
    expect(contexte.progression).toBeNull();
    expect(contexte.teinteBloc).toBe("#D1F1DA");
  });

  it("marque le cadre des EC choisis et calcule la progression de la promotion", () => {
    etat.evaluation.ecCodes = ["EC 2.1"];
    etat.evaluation.classes = ["P1"];
    etat.evaluations = [{ id: "autre", classes: ["P1"], semestre: "S1", items: [{ code: "C2", op: "" }], res: { e1: { n: { "one:C2": 2 } } } }];
    const contexte = contexteCompetences();
    expect(contexte.competences.map((competence) => competence.dansLeCadre)).toEqual([false, true]);
    expect(contexte.cadre).toEqual({ enseignements: 1, unites: 1 });
    expect(contexte.progression?.C2).toMatchObject({ faits: 1, total: 2, etat: "part" });
    expect(contexte.statutDe({ titre: "Autre" })).toBe("évaluée");
  });

  it("retient le filtre et la bascule « tout voir » dans l'état d'affichage", () => {
    const contexte = contexteCompetences();
    expect(contexte.filtre()).toBe("tout");
    contexte.retenirFiltre("fait");
    contexte.basculerToutVoir();
    expect(etat.ui).toMatchObject({ pf: "fait", allComps: true });
    expect(contexte.filtre()).toBe("fait");
  });
});

describe("consigne sous la liste des étudiants", () => {
  it("dit combien d'étudiants sont visés, au singulier ou au pluriel", () => {
    expect(consigneEtudiants(1, 3)).toBe("1 étudiant·e sur 3 : seuls lui est noté à l'étape 4 et exporté.");
    expect(consigneEtudiants(2, 3)).toBe("2 étudiant·es sur 3 : seuls eux sont notés à l'étape 4 et exportés.");
  });

  it("vise toute la promotion sans choix", () => {
    expect(consigneEtudiants(0, 1)).toBe("Toute la promotion — 1 étudiant·e.");
  });

  it("ne dit rien sans étudiant", () => {
    expect(consigneEtudiants(0, 0)).toBe("");
  });
});
