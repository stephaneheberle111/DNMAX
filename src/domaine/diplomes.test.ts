// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { codeAutomatique, codeDiplome, grouperDiplomes, libelleDiplome, nouveauDiplome, supprimerDiplome } from "./diplomes";

describe("codeAutomatique", () => {
  it("prend deux lettres du diplôme et une de la mention, en capitales, sans séparateur", () => {
    expect(codeAutomatique({ nom: "DN MADE", mention: "Objet" })).toBe("DNO");
  });

  it("ignore chiffres, espaces et ponctuation, et garde les lettres accentuées", () => {
    expect(codeAutomatique({ nom: "2-é cole", mention: " (espace)" })).toBe("ÉCE");
  });

  it("rend une chaîne vide sans diplôme ni mention", () => {
    expect(codeAutomatique({})).toBe("");
    expect(codeAutomatique(null)).toBe("");
  });
});

describe("codeDiplome", () => {
  it("préfère le code écrit par l'enseignant, sans espaces autour", () => {
    expect(codeDiplome({ nom: "DN MADE", mention: "Objet", code: " DNMO " })).toBe("DNMO");
  });

  it("revient au code automatique quand le code écrit est vide", () => {
    expect(codeDiplome({ nom: "DN MADE", mention: "Espace", code: "  " })).toBe("DNE");
  });
});

describe("libelleDiplome", () => {
  it("joint le diplôme et sa mention", () => {
    expect(libelleDiplome({ nom: "DN MADE", mention: "Objet" })).toBe("DN MADE mention Objet");
  });

  it("omet la mention absente, et rend une chaîne vide sans diplôme", () => {
    expect(libelleDiplome({ nom: "BTS" })).toBe("BTS");
    expect(libelleDiplome(undefined)).toBe("");
  });
});

describe("grouperDiplomes", () => {
  it("réunit les mentions d'un même diplôme, sans tenir compte de la casse ni des espaces autour", () => {
    const tous = [
      { id: "cadre", nom: "" },
      { id: "o", nom: "DN MADE", mention: "Objet" },
      { id: "b", nom: "BTS", mention: "Design" },
      { id: "e", nom: " dn made ", mention: "Espace" },
    ];
    const groupes = grouperDiplomes(tous.slice(1), tous);
    expect(groupes.map((groupe) => [groupe.nom, groupe.mentions.map((mention) => [mention.diplome.id, mention.rang])])).toEqual([
      ["DN MADE", [["o", 1], ["e", 3]]],
      ["BTS", [["b", 2]]],
    ]);
  });

  it("rend une liste vide sans diplôme visible", () => {
    expect(grouperDiplomes([], [])).toEqual([]);
  });
});

describe("nouveauDiplome", () => {
  it("réutilise le cadre vierge d'une installation neuve plutôt que d'ajouter un diplôme", () => {
    const diplomes: Record<string, unknown>[] = [{ id: "d0", cadre: true, nom: "", mention: "" }];
    const cree = nouveauDiplome(diplomes, (id) => id === "d0", () => "d9");
    expect(cree).toBe(diplomes[0]);
    expect(diplomes).toEqual([{ id: "d0", nom: "Nouveau diplôme", mention: "", code: "", duree: 3 }]);
  });

  it("ajoute un diplôme de trois ans quand il n'y a pas de cadre vierge", () => {
    const diplomes: Record<string, unknown>[] = [{ id: "d0", nom: "DN MADE" }];
    nouveauDiplome(diplomes, () => false, () => "d9");
    expect(diplomes[1]).toEqual({ id: "d9", nom: "Nouveau diplôme", mention: "", code: "", duree: 3 });
  });
});

describe("supprimerDiplome", () => {
  it("retire la mention et son référentiel, et rend la première mention active si c'était elle", () => {
    const donnees = { diplomes: [{ id: "a" }, { id: "b" }], refs: { a: {}, b: {} }, activeDiplome: "a" };
    supprimerDiplome(donnees, 0);
    expect(donnees).toEqual({ diplomes: [{ id: "b" }], refs: { b: {} }, activeDiplome: "b" });
  });

  it("laisse la mention active quand on en retire une autre", () => {
    const donnees = { diplomes: [{ id: "a" }, { id: "b" }], refs: { a: {}, b: {} }, activeDiplome: "a" };
    supprimerDiplome(donnees, 1);
    expect(donnees.activeDiplome).toBe("a");
  });

  it("vide la mention active quand il n'en reste aucune, et ne fait rien pour un rang absent", () => {
    const donnees = { diplomes: [{ id: "a" }], activeDiplome: "a" };
    supprimerDiplome(donnees, 0);
    expect(donnees).toEqual({ diplomes: [], activeDiplome: "" });
    supprimerDiplome(donnees, 4);
    expect(donnees).toEqual({ diplomes: [], activeDiplome: "" });
  });
});
