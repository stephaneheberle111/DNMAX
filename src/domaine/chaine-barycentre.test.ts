// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { compterCroisements, ordonnerParBarycentre, type Relie } from "./chaine-barycentre";

/** Relation lue d'une liste de liens écrits « rang:gauche>droite ». */
function relation(liens: readonly string[]): Relie {
  const ensemble = new Set(liens);
  return (rang, gauche, droite) => ensemble.has(`${String(rang)}:${gauche}>${droite}`);
}

describe("compterCroisements", () => {
  it("compte une paire de liens qui se croisent entre deux colonnes", () => {
    expect(compterCroisements([["a", "b"], ["x", "y"]], relation(["0:a>y", "0:b>x"]))).toBe(1);
  });

  it("ne compte pas deux liens qui partagent une extrémité", () => {
    expect(compterCroisements([["a", "b"], ["x"]], relation(["0:a>x", "0:b>x"]))).toBe(0);
  });

  it("rend zéro sans colonne ou avec une colonne vide", () => {
    expect(compterCroisements([], relation([]))).toBe(0);
    expect(compterCroisements([[], ["x"]], relation([]))).toBe(0);
  });
});

describe("ordonnerParBarycentre", () => {
  it("range chaque colonne au barycentre de ses voisins et supprime les croisements", () => {
    const colonnes = [["s1", "s2"], ["c1", "c2", "c3"], ["e1", "e2", "e3"]];
    const relie = relation(["0:s1>c3", "0:s2>c1", "0:s2>c2", "1:c1>e3", "1:c2>e2", "1:c3>e1"]);
    expect(compterCroisements(colonnes, relie)).toBeGreaterThan(0);
    const ordre = ordonnerParBarycentre(colonnes, relie, new Set([0]));
    expect(ordre[0]).toEqual(["s1", "s2"]);
    expect(ordre[1]).toEqual(["c3", "c1", "c2"]);
    expect(ordre[2]).toEqual(["e1", "e3", "e2"]);
    expect(compterCroisements(ordre, relie)).toBe(0);
  });

  it("range aussi les colonnes éloignées du pivot, de proche en proche", () => {
    const colonnes = [["p"], ["a", "b"], ["x", "y"], ["u", "v"]];
    const relie = relation(["0:p>a", "0:p>b", "1:a>y", "1:b>x", "2:x>v", "2:y>u"]);
    const ordre = ordonnerParBarycentre(colonnes, relie, new Set([0]));
    expect(compterCroisements(ordre, relie)).toBe(0);
    expect(compterCroisements(colonnes, relie)).toBe(2);
  });

  it("laisse inchangé un ordre déjà sans croisement", () => {
    const colonnes = [["s1", "s2"], ["c1", "c2"], ["e1", "e2"]];
    const relie = relation(["0:s1>c1", "0:s2>c2", "1:c1>e1", "1:c2>e2"]);
    expect(ordonnerParBarycentre(colonnes, relie)).toEqual(colonnes);
  });

  it("ne déplace pas une colonne fixe, même si la bouger retirerait des croisements", () => {
    const colonnes = [["s1", "s2"], ["c1", "c2"]];
    const relie = relation(["0:s1>c2", "0:s2>c1"]);
    expect(ordonnerParBarycentre(colonnes, relie, new Set([0, 1]))).toEqual(colonnes);
  });

  it("garde à sa place une case sans lien et accepte une colonne vide", () => {
    const colonnes = [["s1", "s2"], ["c1", "seule", "c2"], []];
    const relie = relation(["0:s1>c2", "0:s2>c1"]);
    const ordre = ordonnerParBarycentre(colonnes, relie, new Set([0]));
    expect(ordre).toEqual([["s1", "s2"], ["c2", "seule", "c1"], []]);
  });

  it("départage les égalités par l'ordre d'origine, de façon reproductible", () => {
    const colonnes = [["p"], ["b", "a", "c"], ["x", "y"]];
    const relie = relation(["0:p>b", "0:p>a", "0:p>c", "1:a>x", "1:b>y", "1:c>x"]);
    const premier = ordonnerParBarycentre(colonnes, relie, new Set([0]));
    expect(ordonnerParBarycentre(colonnes, relie, new Set([0]))).toEqual(premier);
    expect(compterCroisements(premier, relie)).toBeLessThan(compterCroisements(colonnes, relie));
  });
});
