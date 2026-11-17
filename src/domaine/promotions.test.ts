// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { ajouterEtudiants, deplacerEtudiant, etatPromotion, ordrePromotions, rafraichirListe, retirerEtudiant } from "./promotions";

describe("ordrePromotions", () => {
  it("range par diplôme, dans l'ordre des diplômes, puis de la plus récente à la plus ancienne", () => {
    const promotions = [
      { id: "a", diplomeId: "d2", debut: 2024 },
      { id: "b", diplomeId: "d1", debut: 2023 },
      { id: "c", diplomeId: "d1", debut: 2025 },
    ];
    expect(ordrePromotions(promotions, ["d1", "d2"]).map((promotion) => promotion.id)).toEqual(["c", "b", "a"]);
  });

  it("place en tête une promotion d'un diplôme inconnu, sans toucher à la liste reçue", () => {
    const promotions = [
      { id: "a", diplomeId: "d1", debut: 2024 },
      { id: "b", diplomeId: "perdu", debut: 2020 },
    ];
    expect(ordrePromotions(promotions, ["d1"]).map((promotion) => promotion.id)).toEqual(["b", "a"]);
    expect(promotions.map((promotion) => promotion.id)).toEqual(["a", "b"]);
  });

  it("rend une liste vide pour aucune promotion", () => {
    expect(ordrePromotions([], ["d1"])).toEqual([]);
  });
});

describe("etatPromotion", () => {
  it("donne le nom court et l'année de formation d'une promotion en cours", () => {
    expect(etatPromotion(2, 3, "DNO2")).toBe("DNO2 · Année 2");
  });

  it("dit « à venir » avant la première année et « terminée » après la dernière", () => {
    expect(etatPromotion(0, 3, "")).toBe("à venir");
    expect(etatPromotion(4, 3, "")).toBe("terminée");
  });

  it("compte encore la dernière année comme en cours", () => {
    expect(etatPromotion(3, 3, "DNO3")).toBe("DNO3 · Année 3");
  });
});

describe("rafraichirListe", () => {
  it("complète prénom et nom et réécrit la liste texte des étudiants", () => {
    const promotion: Record<string, unknown> = { liste: [{ id: "s1", nom: "Linh Tran" }, { id: "s2", nom: "Noé Baptiste", prenom: "Noé", nomFam: "Baptiste" }] };
    rafraichirListe(promotion);
    expect(promotion.eleves).toBe("Linh Tran\nNoé Baptiste");
    expect(promotion.liste).toEqual([
      { id: "s1", nom: "Linh Tran", prenom: "Linh", nomFam: "Tran" },
      { id: "s2", nom: "Noé Baptiste", prenom: "Noé", nomFam: "Baptiste" },
    ]);
  });

  it("crée une liste vide quand elle manque", () => {
    const promotion: Record<string, unknown> = {};
    rafraichirListe(promotion);
    expect(promotion).toEqual({ liste: [], eleves: "" });
  });
});

describe("deplacerEtudiant", () => {
  it("fait passer l'étudiant d'une promotion à l'autre et met à jour les deux listes", () => {
    const depuis: Record<string, unknown> = { liste: [{ id: "s1", nom: "Linh Tran" }] };
    const vers: Record<string, unknown> = { liste: [{ id: "s2", nom: "Noé Baptiste" }] };
    expect(deplacerEtudiant(depuis, vers, "s1")).toMatchObject({ id: "s1", nom: "Linh Tran" });
    expect(depuis.eleves).toBe("");
    expect(vers.eleves).toBe("Noé Baptiste\nLinh Tran");
  });

  it("ne fait rien pour un étudiant absent de la promotion de départ", () => {
    const depuis: Record<string, unknown> = { liste: [] };
    const vers: Record<string, unknown> = { liste: [] };
    expect(deplacerEtudiant(depuis, vers, "s9")).toBeNull();
    expect(vers).toEqual({ liste: [] });
  });
});

describe("ajouterEtudiants", () => {
  it("ajoute un étudiant par ligne non vide, deux colonnes de tableur comprises", () => {
    const promotion: Record<string, unknown> = { liste: [] };
    let numero = 0;
    const ajoutes = ajouterEtudiants(promotion, "Linh Tran\n\nJean Pierre\tMartin\n", () => `s${String(++numero)}`);
    expect(ajoutes).toBe(2);
    expect(promotion.liste).toEqual([
      { id: "s1", prenom: "Linh", nomFam: "Tran", nom: "Linh Tran" },
      { id: "s2", prenom: "Jean Pierre", nomFam: "Martin", nom: "Jean Pierre Martin" },
    ]);
    expect(promotion.eleves).toBe("Linh Tran\nJean Pierre Martin");
  });

  it("ne touche à rien quand il n'y a aucun nom", () => {
    const promotion: Record<string, unknown> = { liste: [] };
    expect(ajouterEtudiants(promotion, "  \n ", () => "s1")).toBe(0);
    expect(promotion).toEqual({ liste: [] });
  });
});

describe("retirerEtudiant", () => {
  it("retire l'étudiant et met à jour la liste texte", () => {
    const promotion: Record<string, unknown> = { liste: [{ id: "s1", nom: "Linh Tran" }, { id: "s2", nom: "Noé Baptiste" }] };
    retirerEtudiant(promotion, "s1");
    expect(promotion.eleves).toBe("Noé Baptiste");
  });
});
