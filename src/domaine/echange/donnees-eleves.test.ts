// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  extraireDonneesEleves,
  fusionnerResultats,
  lireDonneesEleves,
  lirePromotionEchangee,
  rapprocherListeLibre,
  rapprocherPromotion,
  type PromotionEchangee,
} from "./donnees-eleves";

const RECUE: PromotionEchangee = {
  id: "p1",
  nom: "DNO-2025-2028",
  diplome: "DN MADE",
  mention: "Objet",
  debut: 2025,
  eleves: [
    { id: "s1", nom: "Élève Un" },
    { id: "s2", nom: "Élève Deux" },
  ],
};

function generateur(): () => string {
  let numero = 0;
  return () => {
    numero += 1;
    return `neuf${String(numero)}`;
  };
}

describe("rapprocherPromotion", () => {
  it("crée la promotion quand elle n'existe pas ici", () => {
    const rapprochement = rapprocherPromotion([], RECUE, "d0", generateur());
    expect(rapprochement).toMatchObject({ promotionId: "p1", elevesAjoutes: 2, promotionCreee: true });
    expect(rapprochement?.promotions).toEqual([
      { id: "p1", nom: "DNO-2025-2028", diplomeId: "d0", debut: 2025, liste: RECUE.eleves, eleves: "Élève Un\nÉlève Deux" },
    ]);
  });

  it("rend null quand la promotion est absente et que son diplôme n'existe pas ici", () => {
    expect(rapprocherPromotion([], RECUE, null, generateur())).toBeNull();
  });

  it("retrouve la promotion et ses élèves par identifiant sans rien changer", () => {
    const locales = [{ id: "p1", nom: "Autre nom", diplomeId: "d0", liste: RECUE.eleves }];
    const rapprochement = rapprocherPromotion(locales, RECUE, "d0", generateur());
    expect(rapprochement).toMatchObject({ promotionId: "p1", elevesAjoutes: 0, promotionCreee: false });
    expect(rapprochement?.promotions).toEqual(locales);
  });

  it("retrouve par leur nom une promotion et des élèves saisis séparément", () => {
    const locales = [
      { id: "pLocal", nom: "dno-2025-2028", diplomeId: "d0", liste: [{ id: "a", nom: "eleve  un" }, { id: "b", nom: "ÉLÈVE DEUX" }] },
    ];
    const rapprochement = rapprocherPromotion(locales, RECUE, "d0", generateur());
    expect(rapprochement?.promotionId).toBe("pLocal");
    expect([...(rapprochement?.correspondances ?? [])]).toEqual([
      ["s1", "a"],
      ["s2", "b"],
    ]);
    expect(rapprochement?.elevesAjoutes).toBe(0);
  });

  it("ne confond pas deux promotions de même nom dans des diplômes différents", () => {
    const locales = [{ id: "pAutre", nom: "DNO-2025-2028", diplomeId: "d9", liste: [] }];
    expect(rapprocherPromotion(locales, RECUE, "d0", generateur())).toMatchObject({ promotionCreee: true });
  });

  it("ajoute un élève inconnu sans retirer ni renommer ceux d'ici", () => {
    const locales = [{ id: "p1", nom: "DNO-2025-2028", diplomeId: "d0", liste: [{ id: "s1", nom: "Élève Un (nom local)" }, { id: "s9", nom: "Élève d'ici" }] }];
    const rapprochement = rapprocherPromotion(locales, RECUE, "d0", generateur());
    expect(rapprochement?.elevesAjoutes).toBe(1);
    expect(rapprochement?.promotions).toEqual([
      {
        id: "p1",
        nom: "DNO-2025-2028",
        diplomeId: "d0",
        liste: [{ id: "s1", nom: "Élève Un (nom local)" }, { id: "s9", nom: "Élève d'ici" }, { id: "neuf1", nom: "Élève Deux" }],
        eleves: "Élève Un (nom local)\nÉlève d'ici\nÉlève Deux",
      },
    ]);
    expect(rapprochement?.correspondances.get("s2")).toBe("neuf1");
    expect(locales[0]?.liste).toHaveLength(2);
  });

  it("accepte une promotion reçue sans élèves", () => {
    expect(rapprocherPromotion([], { ...RECUE, eleves: [] }, "d0", generateur())).toMatchObject({ elevesAjoutes: 0 });
  });
});

describe("rapprocherListeLibre", () => {
  it("fait correspondre les rangs par les noms et ajoute les inconnus à la fin", () => {
    const { texte, correspondances, elevesAjoutes } = rapprocherListeLibre("Élève Deux\nÉlève Trois", "Élève Un\néleve deux");
    expect(texte).toBe("Élève Deux\nÉlève Trois\nÉlève Un");
    expect([...correspondances]).toEqual([
      ["libre0", "libre2"],
      ["libre1", "libre0"],
    ]);
    expect(elevesAjoutes).toBe(1);
  });

  it("traite une liste absente comme vide", () => {
    expect(rapprocherListeLibre(undefined, "Élève Un")).toMatchObject({ texte: "Élève Un", elevesAjoutes: 1 });
    expect(rapprocherListeLibre("Élève Un", null)).toMatchObject({ texte: "Élève Un", elevesAjoutes: 0 });
  });
});

describe("fusionnerResultats", () => {
  const identite = new Map([
    ["s1", "s1"],
    ["s2", "s2"],
  ]);

  it("ajoute les résultats d'un élève qui n'en avait pas", () => {
    const { resultats, bilan } = fusionnerResultats({ s1: { n: { a: 3 } } }, { s2: { n: { a: 2 } } }, identite, false);
    expect(resultats).toEqual({ s1: { n: { a: 3 } }, s2: { n: { a: 2 } } });
    expect(bilan).toEqual({ nouveaux: 1, differents: 0, identiques: 0 });
  });

  it("garde les résultats d'ici quand ils diffèrent, sauf demande contraire", () => {
    const locaux = { s1: { n: { a: 3 } } };
    const recus = { s1: { n: { a: 4 } } };
    expect(fusionnerResultats(locaux, recus, identite, false)).toEqual({
      resultats: locaux,
      bilan: { nouveaux: 0, differents: 1, identiques: 0 },
    });
    expect(fusionnerResultats(locaux, recus, identite, true).resultats).toEqual(recus);
  });

  it("compte les résultats identiques sans tenir compte de l'ordre des clés", () => {
    const { bilan } = fusionnerResultats({ s1: { n: { a: 3 }, obs: "x" } }, { s1: { obs: "x", n: { a: 3 } } }, identite, false);
    expect(bilan).toEqual({ nouveaux: 0, differents: 0, identiques: 1 });
  });

  it("suit les correspondances d'identifiants et ignore un élève sans correspondance", () => {
    const { resultats, bilan } = fusionnerResultats({}, { s1: { n: {} }, inconnu: { n: {} } }, new Map([["s1", "local7"]]), false);
    expect(resultats).toEqual({ local7: { n: {} } });
    expect(bilan.nouveaux).toBe(1);
  });

  it("ne touche pas aux élèves d'ici absents du fichier et tolère des résultats absents", () => {
    expect(fusionnerResultats({ s9: { n: {} } }, undefined, identite, true).resultats).toEqual({ s9: { n: {} } });
    expect(fusionnerResultats(null, { s1: { n: {} } }, identite, false).resultats).toEqual({ s1: { n: {} } });
  });
});

describe("lecture des données d'élèves reçues", () => {
  it("ne garde que les champs d'élèves connus", () => {
    const lues = lireDonneesEleves({ promotionId: "p1", champs: { res: {}, titre: "intrus", refV: "v" } });
    expect(lues).toEqual({ promotionId: "p1", champs: { res: {} } });
  });

  it("rend null pour des données mal formées", () => {
    expect(lireDonneesEleves({ champs: {} })).toBeNull();
    expect(lireDonneesEleves("texte")).toBeNull();
    expect(lirePromotionEchangee({ id: "", nom: "x", diplome: "d", mention: "m" })).toBeNull();
    expect(lirePromotionEchangee({ id: "p", nom: "x" })).toBeNull();
  });

  it("écarte les élèves mal formés d'une promotion reçue", () => {
    const promotion = lirePromotionEchangee({ ...RECUE, eleves: [{ id: "s1", nom: "Élève Un" }, { nom: "sans identifiant" }, 3] });
    expect(promotion?.eleves).toEqual([{ id: "s1", nom: "Élève Un" }]);
  });

  it("extrait d'une évaluation ses seuls champs d'élèves", () => {
    const evaluation = { id: "e", titre: "T", res: { s1: {} }, eleves: "Élève Un", suivi: {} };
    expect(extraireDonneesEleves(evaluation, "p1")).toEqual({ promotionId: "p1", champs: { res: { s1: {} }, eleves: "Élève Un" } });
  });
});
