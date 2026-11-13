// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  aDesNiveaux,
  aimanterPourcentage,
  avancementEtudiant,
  bilanSaisie,
  bornesNiveaux,
  changerRendu,
  etudiantsSansRendu,
  evaluationCommencee,
  niveauDuPourcentage,
  noterNiveau,
  pourcentageAffiche,
  statutRendu,
} from "./saisie-resultats";

const AUJOURDHUI = "2026-11-13";
const HIER = "2026-11-12";
/** Échelle des niveaux de maîtrise du DN MADE : quatre niveaux. */
const QUATRE = 4;

describe("bornesNiveaux", () => {
  it("resserre les deux niveaux extrêmes d'une échelle de quatre", () => {
    expect(bornesNiveaux(QUATRE)).toEqual([0, 15, 50, 85, 100]);
  });

  it("coupe une échelle de deux niveaux en son milieu", () => {
    expect(bornesNiveaux(2)).toEqual([0, 50, 100]);
  });

  it("n'a pas de seuil intérieur pour une échelle vide ou d'un seul niveau", () => {
    expect(bornesNiveaux(0)).toEqual([0, 100]);
    expect(bornesNiveaux(1)).toEqual([0, 100]);
  });

  it("couvre toujours de 0 à 100 avec un seuil de plus que de niveaux", () => {
    for (const nombre of [3, 5, 6]) {
      const bornes = bornesNiveaux(nombre);
      expect(bornes).toHaveLength(nombre + 1);
      expect(bornes[0]).toBe(0);
      expect(bornes[nombre]).toBe(100);
    }
  });
});

describe("niveauDuPourcentage", () => {
  it("range un pourcentage dans le niveau dont il a franchi le seuil", () => {
    expect(niveauDuPourcentage(0, QUATRE)).toBe(0);
    expect(niveauDuPourcentage(14, QUATRE)).toBe(0);
    expect(niveauDuPourcentage(30, QUATRE)).toBe(1);
    expect(niveauDuPourcentage(60, QUATRE)).toBe(2);
    expect(niveauDuPourcentage(100, QUATRE)).toBe(3);
  });

  it("attribue un seuil exact au niveau supérieur", () => {
    expect(niveauDuPourcentage(15, QUATRE)).toBe(1);
    expect(niveauDuPourcentage(50, QUATRE)).toBe(2);
    expect(niveauDuPourcentage(85, QUATRE)).toBe(3);
  });

  it("ne connaît que le niveau 0 pour une échelle vide ou d'un seul niveau", () => {
    expect(niveauDuPourcentage(100, 0)).toBe(0);
    expect(niveauDuPourcentage(100, 1)).toBe(0);
  });
});

describe("aimanterPourcentage", () => {
  it("colle à 0 dans le premier niveau et à 100 dans le dernier", () => {
    expect(aimanterPourcentage(9.4, QUATRE)).toBe(0);
    expect(aimanterPourcentage(91.2, QUATRE)).toBe(100);
  });

  it("arrondit au pourcent dans les niveaux intermédiaires", () => {
    expect(aimanterPourcentage(42.6, QUATRE)).toBe(43);
  });

  it("vaut 100 pour une échelle d'un seul niveau", () => {
    expect(aimanterPourcentage(3, 1)).toBe(100);
  });
});

describe("pourcentageAffiche", () => {
  it("rend la position saisie quand elle correspond au niveau enregistré", () => {
    expect(pourcentageAffiche({ n: { a: 1 }, p: { a: 22 } }, "a", QUATRE)).toBe(22);
  });

  it("rend le milieu du niveau quand la position manque ou ne lui correspond plus", () => {
    expect(pourcentageAffiche({ n: { a: 1 } }, "a", QUATRE)).toBe(33);
    expect(pourcentageAffiche({ n: { a: 2 }, p: { a: 22 } }, "a", QUATRE)).toBe(68);
  });

  it("place le premier niveau à 0 et le dernier à 100", () => {
    expect(pourcentageAffiche({ n: { a: 0 } }, "a", QUATRE)).toBe(0);
    expect(pourcentageAffiche({ n: { a: 3 } }, "a", QUATRE)).toBe(100);
  });

  it("ne rend rien sans niveau saisi, ni pour un résultat absent", () => {
    expect(pourcentageAffiche({ n: { a: "" }, p: { a: 40 } }, "a", QUATRE)).toBeNull();
    expect(pourcentageAffiche({ n: {} }, "a", QUATRE)).toBeNull();
    expect(pourcentageAffiche(undefined, "a", QUATRE)).toBeNull();
  });
});

describe("statutRendu", () => {
  it("lit le statut renseigné", () => {
    expect(statutRendu({ rendu: HIER })).toBe("rendu");
    expect(statutRendu({ nr: HIER })).toBe("nr");
    expect(statutRendu({ disp: HIER })).toBe("disp");
  });

  it("tient pour rendu un étudiant dont un niveau est saisi", () => {
    expect(statutRendu({ n: { a: 0 } })).toBe("rendu");
  });

  it("n'est pas renseigné pour un résultat vide, absent ou illisible", () => {
    expect(statutRendu({ n: { a: "" }, obs: {}, appr: "" })).toBe("");
    expect(statutRendu(undefined)).toBe("");
    expect(statutRendu("rendu")).toBe("");
  });
});

describe("aDesNiveaux", () => {
  it("compte un niveau 0 comme une saisie", () => {
    expect(aDesNiveaux({ n: { a: 0 } })).toBe(true);
  });

  it("ignore les niveaux vides ou nuls", () => {
    expect(aDesNiveaux({ n: { a: "", b: null } })).toBe(false);
  });
});

describe("changerRendu", () => {
  const saisi = { n: { a: 2 }, p: { a: 60 }, c: { a: 6 }, obs: { a: "Soigné" }, appr: "Bon travail", rendu: HIER, rest: HIER };

  it("marque rendu sans toucher à la saisie", () => {
    const { resultat, avis } = changerRendu({ n: {}, obs: {}, appr: "" }, "rendu", AUJOURDHUI);
    expect(resultat).toEqual({ n: {}, obs: {}, appr: "", rendu: AUJOURDHUI });
    expect(avis).toBeNull();
  });

  it("efface niveaux, observations et appréciation d'un non rendu, et le signale", () => {
    const { resultat, avis } = changerRendu(saisi, "nr", AUJOURDHUI);
    expect(resultat).toEqual({ n: {}, p: {}, c: {}, obs: {}, appr: "", nr: AUJOURDHUI, rest: HIER });
    expect(avis).toBe("saisie-effacee");
  });

  it("efface de même la saisie d'un dispensé", () => {
    const { resultat, avis } = changerRendu(saisi, "disp", AUJOURDHUI);
    expect(resultat).toMatchObject({ n: {}, obs: {}, appr: "", disp: AUJOURDHUI });
    expect(resultat).not.toHaveProperty("rendu");
    expect(avis).toBe("saisie-effacee");
  });

  it("ne signale rien quand il n'y avait rien à effacer", () => {
    expect(changerRendu({ n: {}, obs: {}, appr: "", rendu: HIER }, "nr", AUJOURDHUI).avis).toBeNull();
  });

  it("signale l'effacement d'une appréciation seule", () => {
    expect(changerRendu({ n: {}, obs: {}, appr: "À revoir" }, "disp", AUJOURDHUI).avis).toBe("saisie-effacee");
  });

  it("refuse de revenir à « non renseigné » quand des niveaux sont saisis", () => {
    const { resultat, avis } = changerRendu(saisi, "", AUJOURDHUI);
    expect(resultat).toMatchObject({ n: { a: 2 }, rendu: AUJOURDHUI });
    expect(avis).toBe("reste-rendu");
  });

  it("revient à « non renseigné » quand rien n'est saisi", () => {
    const { resultat, avis } = changerRendu({ n: {}, obs: {}, appr: "", nr: HIER }, "", AUJOURDHUI);
    expect(statutRendu(resultat)).toBe("");
    expect(avis).toBeNull();
  });

  it("ne modifie pas le résultat reçu", () => {
    const copie = structuredClone(saisi);
    changerRendu(saisi, "nr", AUJOURDHUI);
    expect(saisi).toEqual(copie);
  });

  it("part d'un résultat vide quand il est absent", () => {
    expect(changerRendu(undefined, "nr", AUJOURDHUI).resultat).toMatchObject({ nr: AUJOURDHUI, n: {} });
  });
});

describe("noterNiveau", () => {
  it("enregistre le niveau et la position, et passe l'étudiant à rendu", () => {
    const { resultat, effet } = noterNiveau({ n: {}, obs: {}, appr: "" }, "a", 60, QUATRE, AUJOURDHUI);
    expect(resultat).toEqual({ n: { a: 2 }, p: { a: 60 }, obs: {}, appr: "", rendu: AUJOURDHUI });
    expect(effet).toBe("devenu-rendu");
  });

  it("garde la date de rendu d'un étudiant déjà rendu", () => {
    const { resultat, effet } = noterNiveau({ n: { a: 1 }, p: { a: 20 }, rendu: HIER }, "b", 100, QUATRE, AUJOURDHUI);
    expect(resultat).toMatchObject({ n: { a: 1, b: 3 }, p: { a: 20, b: 100 }, rendu: HIER });
    expect(effet).toBe("inchange");
  });

  it("lève un « non rendu » ou une dispense dès qu'un niveau est saisi", () => {
    const { resultat, effet } = noterNiveau({ n: {}, nr: HIER }, "a", 0, QUATRE, AUJOURDHUI);
    expect(resultat).not.toHaveProperty("nr");
    expect(resultat).toMatchObject({ n: { a: 0 }, rendu: AUJOURDHUI });
    expect(effet).toBe("absence-levee");
  });

  it("efface le niveau d'une ligne sans changer le statut de rendu", () => {
    const { resultat, effet } = noterNiveau({ n: { a: 2, b: 1 }, p: { a: 60, b: 20 }, c: { a: 6 }, rendu: HIER }, "a", null, QUATRE, AUJOURDHUI);
    expect(resultat).toEqual({ n: { b: 1 }, p: { b: 20 }, c: {}, rendu: HIER });
    expect(effet).toBe("inchange");
  });

  it("retire l'ancien détail du niveau de la ligne notée", () => {
    const { resultat } = noterNiveau({ n: { a: 1 }, c: { a: 2, b: 5 }, rendu: HIER }, "a", 90, QUATRE, AUJOURDHUI);
    expect(resultat.c).toEqual({ b: 5 });
  });

  it("ne modifie pas le résultat reçu", () => {
    const depart = { n: { a: 1 }, p: { a: 20 }, rendu: HIER };
    const copie = structuredClone(depart);
    noterNiveau(depart, "a", 90, QUATRE, AUJOURDHUI);
    expect(depart).toEqual(copie);
  });
});

describe("avancementEtudiant", () => {
  it("compte les lignes de l'évaluation qui ont un niveau", () => {
    expect(avancementEtudiant({ n: { a: 0, b: "", c: 2 } }, ["a", "b", "c"])).toEqual({ n: 2, tot: 3 });
  });

  it("ignore les niveaux de lignes qui ne sont plus dans l'évaluation", () => {
    expect(avancementEtudiant({ n: { ancienne: 3 } }, ["a"])).toEqual({ n: 0, tot: 1 });
  });

  it("vaut zéro pour un résultat absent", () => {
    expect(avancementEtudiant(undefined, ["a", "b"])).toEqual({ n: 0, tot: 2 });
  });
});

describe("bilanSaisie", () => {
  const resultats = { e1: { n: { a: 1, b: 2 } }, e2: { n: { a: 1 } }, e3: { n: {} } };

  it("distingue les étudiants complets, commencés et non commencés", () => {
    expect(bilanSaisie(resultats, ["e1", "e2", "e3", "e4"], ["a", "b"])).toEqual({ faits: 1, partiels: 1 });
  });

  it("ne compte que les étudiants de l'évaluation", () => {
    expect(bilanSaisie(resultats, ["e3"], ["a", "b"])).toEqual({ faits: 0, partiels: 0 });
  });

  it("ne tient personne pour fait sans ligne à évaluer", () => {
    expect(bilanSaisie(resultats, ["e1", "e2"], [])).toEqual({ faits: 0, partiels: 0 });
  });

  it("vaut zéro sans résultats", () => {
    expect(bilanSaisie(undefined, ["e1"], ["a"])).toEqual({ faits: 0, partiels: 0 });
  });
});

describe("etudiantsSansRendu", () => {
  it("compte les étudiants dont le statut n'est pas renseigné", () => {
    const resultats = { e1: { rendu: HIER }, e2: { nr: HIER }, e3: { n: {} }, e4: { n: { a: 1 } } };
    expect(etudiantsSansRendu(resultats, ["e1", "e2", "e3", "e4", "e5"])).toBe(2);
  });

  it("vaut zéro sans étudiant", () => {
    expect(etudiantsSansRendu({}, [])).toBe(0);
  });
});

describe("evaluationCommencee", () => {
  it("est commencée dès qu'elle a un intitulé, un livrable ou une compétence", () => {
    expect(evaluationCommencee({ titre: "Fiche de lecture" })).toBe(true);
    expect(evaluationCommencee({ titre: "", livrables: ["Carnet de projet"] })).toBe(true);
    expect(evaluationCommencee({ items: [{ code: "C1.1" }] })).toBe(true);
  });

  it("ne l'est pas tant qu'elle est vide", () => {
    expect(evaluationCommencee({ titre: "", livrables: [], items: [] })).toBe(false);
  });

  it("ne tient pas un intitulé fait d'espaces pour un intitulé", () => {
    expect(evaluationCommencee({ titre: "   " })).toBe(false);
  });

  it("ne l'est pas pour une valeur absente ou illisible", () => {
    expect(evaluationCommencee(undefined)).toBe(false);
    expect(evaluationCommencee("Fiche de lecture")).toBe(false);
  });
});
