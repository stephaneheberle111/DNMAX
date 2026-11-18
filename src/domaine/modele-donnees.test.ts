// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import {
  absorber,
  ajouterMention,
  associationsProposees,
  classerDictionnaire,
  codeAnnee,
  construireDonnees,
  donneesAEnregistrer,
  donneesDuReferentiel,
  materialiser,
  projeterReferentiel,
  projeterVersion,
  referentielDe,
  type Donnees,
  type Element,
  type Referentiel,
  type NouvelIdentifiant,
} from "./modele-donnees";

function compteur(): NouvelIdentifiant {
  let numero = 0;
  return (prefixe) => `${prefixe}${String(++numero)}`;
}

/** Deux mentions, des éléments communs écrits différemment, à l'ancienne (mêlés à la racine). */
function donneesAnciennes(): Donnees {
  return {
    diplomes: [
      { id: "d1", nom: "DN MADE", mention: "Objet" },
      { id: "d2", nom: "DN MADE", mention: "Espace" },
    ],
    activeDiplome: "d1",
    ues: [
      { id: "u1", nom: "Ateliers", code: "UE1", sems: ["S1", "S2"], diplomeId: "d1" },
      { id: "u2", nom: "ATELIERS", code: "ue1", diplomeId: "d2" },
    ],
    ecs: [
      { id: "e1", nom: "Projet", ueId: "u1", sems: ["S3", "S1"], code: "EC 1.1", ects: "3" },
      { id: "e2", nom: "Projet", ueId: "u1", sems: ["S2"], codes: { 1: "EC 1.9" } },
    ],
    blocs: [{ id: "b1", num: "1", nom: "Créer", diplomeId: "d1" }],
    competences: [
      { id: "c1", code: "C1.1", libelle: "Concevoir", bloc: 1, ecs: [{ id: "e1", sems: ["S1"] }], diplomeId: "d1" },
      { id: "c2", code: "C1.2", libelle: "Réaliser", ecIds: ["e2"], diplomeId: "inconnu" },
    ],
  };
}

function classees(): Donnees {
  const donnees = donneesAnciennes();
  classerDictionnaire(donnees, compteur());
  return donnees;
}

describe("referentielDe", () => {
  it("crée un référentiel vide pour un diplôme qui n'en a pas, puis rend le même", () => {
    const donnees: Donnees = {};
    const referentiel = referentielDe(donnees, "d9");
    expect(referentiel).toEqual({ ues: [], ecs: [], blocs: [], competences: [] });
    expect(referentielDe(donnees, "d9")).toBe(referentiel);
  });
});

describe("classerDictionnaire", () => {
  it("fait une seule entrée du dictionnaire d'une UE écrite différemment dans deux mentions", () => {
    const donnees = classees();
    const dico = donnees.dico as Record<string, Element[]>;
    expect(dico.ues).toEqual([{ id: "u1", nom: "Ateliers", code: "UE1", couleur: "" }]);
    const refs = donnees.refs as Record<string, Referentiel>;
    expect(refs.d2?.ues).toEqual([{ id: "u1", sems: ["S1", "S2", "S3", "S4", "S5", "S6"] }]);
  });

  it("réunit deux EC de même nom et même UE, semestres rangés et code de chaque année", () => {
    const refs = classees().refs as Record<string, Referentiel>;
    expect(refs.d1?.ecs).toEqual([{ id: "e1", ueId: "u1", sems: ["S1", "S2", "S3"], ects: "3", codes: { 1: "EC 1.1", 2: "EC 1.1" } }]);
  });

  it("range un élément d'un diplôme inconnu dans le diplôme actif", () => {
    const refs = classees().refs as Record<string, Referentiel>;
    expect(refs.d1?.competences.map((competence) => competence.id)).toEqual(["c1", "c2"]);
  });

  it("donne à une compétence liée par ecIds les semestres de l'ancien EC", () => {
    const refs = classees().refs as Record<string, Referentiel>;
    expect(refs.d1?.competences[1]).toEqual({ id: "c2", bloc: "", ecs: [{ id: "e1", sems: ["S2"] }] });
  });

  it("tire un identifiant pour un élément qui n'en a pas", () => {
    const donnees = donneesAnciennes();
    (donnees.blocs as Element[]).push({ num: "2", nom: "Comprendre" });
    classerDictionnaire(donnees, compteur());
    expect((donnees.dico as Record<string, Element[]>).blocs?.map((bloc) => bloc.id)).toEqual(["b1", "b1"]);
  });
});

describe("materialiser", () => {
  it("montre le référentiel actif avec les champs du dictionnaire et des valeurs par défaut", () => {
    const donnees = classees();
    materialiser(donnees);
    expect(donnees._viewOf).toBe("d1");
    expect(donnees.ues).toEqual([{ id: "u1", nom: "Ateliers", code: "UE1", couleur: "", sems: ["S1", "S2"], diplomeId: "d1" }]);
    expect(donnees.ecs).toEqual([{ id: "e1", nom: "Projet", couleur: "#9aa2ae", ueId: "u1", sems: ["S1", "S2", "S3"], ects: "3", codes: { 1: "EC 1.1", 2: "EC 1.1" } }]);
    expect((donnees.competences as Element[])[0]?.ecIds).toEqual(["e1"]);
  });

  it("ignore une association dont l'élément manque au dictionnaire", () => {
    const donnees = classees();
    referentielDe(donnees, "d1").ues.push({ id: "fantome", sems: [] });
    materialiser(donnees);
    expect((donnees.ues as Element[]).map((ue) => ue.id)).toEqual(["u1"]);
  });

  it("montre un diplôme sans référentiel comme vide", () => {
    const donnees = classees();
    donnees.activeDiplome = "d3";
    materialiser(donnees);
    expect(donnees.ues).toEqual([]);
  });
});

describe("absorber", () => {
  it("reporte une modification de la vue dans le dictionnaire et le référentiel", () => {
    const donnees = classees();
    materialiser(donnees);
    const ue = (donnees.ues as Element[])[0] as Element;
    ue.nom = "Ateliers de création";
    ue.sems = ["S1"];
    absorber(donnees, compteur());
    expect((donnees.dico as Record<string, Element[]>).ues?.[0]?.nom).toBe("Ateliers de création");
    expect(referentielDe(donnees, "d1").ues).toEqual([{ id: "u1", sems: ["S1"] }]);
    expect(referentielDe(donnees, "d2").ues).toEqual([{ id: "u1", sems: ["S1", "S2", "S3", "S4", "S5", "S6"] }]);
  });

  it("donne un identifiant et une entrée de dictionnaire à un élément ajouté dans la vue", () => {
    const donnees = classees();
    materialiser(donnees);
    (donnees.blocs as Element[]).push({ num: "3", nom: "Communiquer" });
    absorber(donnees, compteur());
    expect(referentielDe(donnees, "d1").blocs).toEqual([{ id: "b1" }, { id: "b1" }]);
  });

  it("ne fait rien si le diplôme montré n'existe plus", () => {
    const donnees = classees();
    materialiser(donnees);
    donnees._viewOf = "supprime";
    const avant = JSON.stringify(donnees.refs);
    absorber(donnees, compteur());
    expect(JSON.stringify(donnees.refs)).toBe(avant);
  });
});

describe("donneesAEnregistrer", () => {
  it("laisse de côté la vue fusionnée sans toucher aux données tenues", () => {
    const donnees = classees();
    materialiser(donnees);
    const enregistrees = donneesAEnregistrer(donnees);
    expect(Object.keys(enregistrees)).not.toContain("ues");
    expect(Object.keys(enregistrees)).not.toContain("_viewOf");
    expect(donnees.ues).toBeDefined();
  });
});

describe("associationsProposees", () => {
  it("reprend les associations d'un autre diplôme, sans UE absente du référentiel cible", () => {
    const donnees = classees();
    referentielDe(donnees, "d2").ues = [];
    expect(associationsProposees(donnees, "d2", "ecs", "e1")).toEqual({ id: "e1", ueId: "", sems: ["S1", "S2", "S3"], ects: "3", codes: { 1: "EC 1.1", 2: "EC 1.1" } });
  });

  it("propose des associations vides pour un élément jamais placé", () => {
    expect(associationsProposees(classees(), "d2", "competences", "neuf")).toEqual({ id: "neuf", ecs: [], bloc: "" });
  });

  it("retire d'une compétence les liens vers des EC absents du référentiel cible", () => {
    const donnees = classees();
    expect(associationsProposees(donnees, "d2", "competences", "c1")).toEqual({ id: "c1", bloc: "1", ecs: [] });
  });
});

describe("ajouterMention", () => {
  it("copie le référentiel source dans un diplôme neuf, sans lien avec l'original", () => {
    const donnees = classees();
    materialiser(donnees);
    const mention = ajouterMention(donnees, "d1", "DN MADE", compteur());
    expect(mention).toEqual({ id: "d1", nom: "DN MADE", mention: "", code: "" });
    expect((donnees.diplomes as Element[]).length).toBe(3);
  });

  it("ne partage pas les associations avec le diplôme copié", () => {
    const donnees = classees();
    materialiser(donnees);
    const mention = ajouterMention(donnees, "d2", "", (prefixe) => `${prefixe}-neuf`);
    referentielDe(donnees, mention.id as string).ues.length = 0;
    expect(referentielDe(donnees, "d2").ues).toHaveLength(1);
  });
});

describe("donneesDuReferentiel", () => {
  const source = {
    meta: { diplome: "DN MADE mention Objet" },
    ues: [{ nom: "UE-ATELIER" }],
    familles: [{ nom: "EC Projet", ue: "UE ATELIER" }],
    blocs: [{ num: 1, nom: "Créer" }],
    competences: [
      {
        code: "C1",
        libelle: "Concevoir",
        bloc: 1,
        ecs: [
          { famille: "EC Projet", sem: "S3", ec: "EC 11.1" },
          { famille: "Projet", sem: "S1", ec: "EC 1.1" },
        ],
      },
    ],
  };

  it("retire le trait d'union entre capitales et réunit une famille d'EC écrite avec ou sans « EC »", () => {
    const donnees = donneesDuReferentiel(source, ["Carnet"]);
    expect(donnees.ues).toEqual([
      { id: "u0", nom: "UEATELIER", couleur: "#9aa2ae" },
      { id: "u1", nom: "UE ATELIER", couleur: "#9aa2ae" },
    ]);
    expect(donnees.ecs).toEqual([{ id: "e0", nom: "Projet", couleur: "#9aa2ae", ueId: "u1", sems: ["S1", "S3"], ects: "", codes: { 1: "EC 1.1", 2: "EC 11.1" } }]);
  });

  it("garde dans chaque compétence les semestres de chaque EC, rangés", () => {
    const donnees = donneesDuReferentiel(source, undefined);
    expect(donnees.competences).toEqual([{ id: "c0", code: "C1", bloc: "1", libelle: "Concevoir", ecs: [{ id: "e0", sems: ["S1", "S3"] }] }]);
    expect(donnees.livrables).toEqual([]);
  });

  it("rend des données vides pour un référentiel vide", () => {
    expect(donneesDuReferentiel({}, [])).toEqual({ diplome: "", blocTint: "#D1F1DA", niveaux: [], blocs: [], ues: [], ecs: [], competences: [], livrables: [] });
  });
});

describe("construireDonnees", () => {
  it("sépare le diplôme et la mention et montre le référentiel", () => {
    const donnees = construireDonnees(donneesDuReferentiel({ meta: { diplome: "DN MADE mention Objet", niveaux: [{ annee: 1, code: "DN1" }, { annee: 2, code: "X2" }] } }, ["Carnet"]), compteur());
    expect(donnees.diplomes).toEqual([{ id: "d0", nom: "DN MADE", mention: "Objet" }]);
    expect(donnees.niveaux).toEqual([{ annee: 1, code: "" }, { annee: 2, code: "X2" }]);
    expect(donnees.livrables).toEqual([{ nom: "Carnet", type: "" }]);
    expect(donnees._viewOf).toBe("d0");
    expect("diplome" in donnees).toBe(false);
  });

  it("crée un diplôme-cadre caché quand le référentiel ne nomme pas de diplôme", () => {
    const donnees = construireDonnees(donneesDuReferentiel({}, []), compteur());
    expect(donnees.diplomes).toEqual([{ id: "d0", nom: "", mention: "", cadre: true }]);
  });
});

describe("codeAnnee", () => {
  const donnees: Donnees = { activeDiplome: "d1", diplomes: [{ id: "d1", nom: "DN MADE", mention: "Objet", code: "DNO" }], niveaux: [{ annee: 1, code: " A1 " }, { annee: 2, code: "" }] };

  it("prend le code que le référentiel donne à l'année", () => {
    expect(codeAnnee(1, donnees)).toBe("A1");
  });

  it("compose sinon le code du diplôme et le numéro d'année", () => {
    expect(codeAnnee(2, donnees)).toBe("DNO2");
    expect(codeAnnee("3", donnees)).toBe("DNO3");
  });
});

describe("projeterReferentiel", () => {
  function projetable(): Donnees {
    const donnees = classees();
    materialiser(donnees);
    return donnees;
  }

  it("donne à chaque compétence une entrée par EC et par semestre enseigné", () => {
    const projection = projeterReferentiel(projetable());
    const competences = projection.competences as Element[];
    expect(competences[0]?.ecs).toEqual([{ ec: "EC 1.1", id: "e1", nom: "Projet", couleur: "#9aa2ae", ue: "Ateliers", sem: "S1", dn: "DNO1" }]);
  });

  it("écarte un semestre où l'UE de l'EC n'a pas cours", () => {
    const donnees = projetable();
    const competence = (donnees.competences as Element[])[1] as Element;
    competence.ecs = [{ id: "e1", sems: ["S3"] }];
    expect(((projeterReferentiel(donnees).competences as Element[])[1] as Element).ecs).toEqual([]);
  });

  it("nomme « — » un EC sans nom ni code", () => {
    const donnees = projetable();
    const ec = (donnees.ecs as Element[])[0] as Element;
    ec.nom = "";
    ec.codes = {};
    expect(((projeterReferentiel(donnees).ecs as Element[])[0] as Element).nom).toBe("—");
  });
});

describe("projeterVersion", () => {
  it("projette une version sans modifier les données tenues", () => {
    const donnees = classees();
    materialiser(donnees);
    const avant = JSON.stringify(donnees);
    const projection = projeterVersion(donnees, "d1", { ues: [], ecs: [], blocs: [], competences: [] });
    expect(projection.competences).toEqual([]);
    expect(JSON.stringify(donnees)).toBe(avant);
  });
});
