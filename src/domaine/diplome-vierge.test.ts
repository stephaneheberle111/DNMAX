// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { estCadreVierge, nettoyerDiplomesVierges } from "./diplome-vierge";

const VIDE = { ues: [], ecs: [], blocs: [], competences: [] };
const REMPLI = { ...VIDE, competences: [{ id: "c0" }] };
const OBJET = { id: "d1", nom: "DN MADE", mention: "Objet", code: "" };
const ANCIEN_CADRE = { id: "d0", nom: "Diplôme", mention: "" };
const CADRE = { id: "d0", nom: "", mention: "", cadre: true };

function donnees(diplomes: object[], complement: object = {}): Record<string, unknown> {
  return {
    diplomes,
    activeDiplome: "d0",
    dico: VIDE,
    refs: { d0: VIDE, d1: REMPLI },
    versions: { d1: [{ id: "v1" }] },
    valide: { d1: "v1" },
    etab: "Lycée",
    ...complement,
  };
}

describe("nettoyerDiplomesVierges", () => {
  it("retire l'ancien cadre « Diplôme » vierge resté à côté d'un vrai diplôme", () => {
    const resultat = nettoyerDiplomesVierges(donnees([ANCIEN_CADRE, OBJET]), []);
    expect(resultat?.retires).toEqual(["d0"]);
    expect(resultat?.donnees).toEqual({
      diplomes: [OBJET],
      activeDiplome: "d1",
      dico: VIDE,
      refs: { d1: REMPLI },
      versions: { d1: [{ id: "v1" }] },
      valide: { d1: "v1" },
      etab: "Lycée",
    });
  });

  it("retire un cadre marqué sans changer le diplôme actif quand ce n'est pas lui", () => {
    const resultat = nettoyerDiplomesVierges(donnees([CADRE, OBJET], { activeDiplome: "d1" }), []);
    expect(resultat?.retires).toEqual(["d0"]);
    expect(resultat?.donnees.activeDiplome).toBe("d1");
  });

  it("garde le cadre auquel une promotion est rattachée", () => {
    const resultat = nettoyerDiplomesVierges(donnees([ANCIEN_CADRE, OBJET]), [{ id: "p1", diplomeId: "d0" }]);
    expect(resultat).toMatchObject({ retires: [], modifie: false });
  });

  it("garde le cadre dont le référentiel ou une version n'est pas vide", () => {
    expect(nettoyerDiplomesVierges(donnees([ANCIEN_CADRE, OBJET], { refs: { d0: REMPLI, d1: REMPLI } }), [])?.modifie).toBe(false);
    expect(nettoyerDiplomesVierges(donnees([ANCIEN_CADRE, OBJET], { versions: { d0: [{ id: "v0" }] } }), [])?.modifie).toBe(false);
    expect(nettoyerDiplomesVierges(donnees([ANCIEN_CADRE, OBJET], { refs: { d0: "illisible" } }), [])?.modifie).toBe(false);
  });

  it("garde un diplôme créé à la main même s'il est encore vide", () => {
    const nouveau = { id: "d2", nom: "Nouveau diplôme", mention: "", code: "" };
    expect(nettoyerDiplomesVierges(donnees([OBJET, nouveau]), [])?.modifie).toBe(false);
  });

  it("garde le cadre seul, en le marquant et en effaçant l'ancien nom « Diplôme »", () => {
    const resultat = nettoyerDiplomesVierges(donnees([ANCIEN_CADRE], { refs: { d0: VIDE } }), []);
    expect(resultat?.retires).toEqual([]);
    expect(resultat?.donnees.diplomes).toEqual([CADRE]);
    expect(resultat?.donnees.activeDiplome).toBe("d0");
  });

  it("ne garde qu'un cadre quand il n'y a que des cadres vierges", () => {
    const second = { ...CADRE, id: "d9" };
    const resultat = nettoyerDiplomesVierges(donnees([CADRE, second], { refs: {} }), []);
    expect(resultat?.retires).toEqual(["d9"]);
    expect(resultat?.donnees.diplomes).toEqual([CADRE]);
  });

  it("ne change rien à un second passage", () => {
    const premier = nettoyerDiplomesVierges(donnees([ANCIEN_CADRE, OBJET]), []);
    const second = nettoyerDiplomesVierges(premier?.donnees, []);
    expect(second).toEqual({ donnees: premier?.donnees, retires: [], modifie: false });
  });

  it("rend null pour des données ou des promotions illisibles", () => {
    expect(nettoyerDiplomesVierges(null, [])).toBeNull();
    expect(nettoyerDiplomesVierges({ diplomes: "d0" }, [])).toBeNull();
    expect(nettoyerDiplomesVierges(donnees([ANCIEN_CADRE, OBJET]), "illisible")).toBeNull();
  });
});

describe("estCadreVierge", () => {
  it("reconnaît le cadre vierge d'une installation neuve", () => {
    expect(estCadreVierge(donnees([CADRE], { refs: { d0: VIDE } }), "d0", [])).toBe(true);
  });

  it("ne cache ni un vrai diplôme, ni un cadre qui a servi", () => {
    expect(estCadreVierge(donnees([CADRE, OBJET]), "d1", [])).toBe(false);
    expect(estCadreVierge(donnees([CADRE]), "d0", [{ diplomeId: "d0" }])).toBe(false);
    expect(estCadreVierge(donnees([CADRE], { refs: { d0: REMPLI } }), "d0", [])).toBe(false);
  });

  it("répond non pour un diplôme inconnu ou des données illisibles", () => {
    expect(estCadreVierge(donnees([CADRE]), "d5", [])).toBe(false);
    expect(estCadreVierge("illisible", "d0", [])).toBe(false);
    expect(estCadreVierge(donnees([CADRE]), "d0", null)).toBe(false);
  });
});
